import { supabase } from './supabaseClient';
import {
  Device,
  GlobalSettings,
  InquiryLog,
  User,
  Category,
  SafeDeviceDTO,
  RequestStatusDTO,
  Project,
  Comment,
  ProjectSummaryDTO,
  PriceBreakdown,
} from './types';

class SupabaseBackendService {
  private currentUser: User | null = null;

  async login(username: string, password?: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;

    const user = {
      id: data.id,
      username: data.username,
      fullName: data.full_name,
      role: data.role as 'admin' | 'employee',
      isActive: data.is_active,
    };

    if (data.password && data.password !== password) return null;

    this.currentUser = user;
    return user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
  }

  private async calculateBreakdown(device: Device): Promise<PriceBreakdown> {
    const { data: settings } = await supabase
      .from('global_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!settings) throw new Error('Settings not found');

    const S = {
      discountMultiplier: settings.discount_multiplier,
      freightRatePerLengthEUR: settings.freight_rate_per_length_eur,
      customsNumerator: settings.customs_numerator,
      customsDenominator: settings.customs_denominator,
      warrantyRate: settings.warranty_rate,
      internalCommissionFactor: settings.internal_commission_factor,
      companyCostFactor: settings.company_cost_factor,
      profitFactor: settings.profit_factor,
    };

    const P = device.factoryPriceEUR;
    const L = device.length;
    const W = device.weight;

    const companyPrice = P * S.discountMultiplier;
    const shipment = L * S.freightRatePerLengthEUR;
    const custom = W * (S.customsNumerator / S.customsDenominator);
    const warranty = companyPrice * S.warrantyRate;
    const subtotal = companyPrice + shipment + custom + warranty;
    const commission = subtotal / S.internalCommissionFactor;
    const office = commission / S.companyCostFactor;
    const sellPrice = Math.ceil(office / S.profitFactor);

    return {
      inputs: { P, L, W },
      params: {
        D: S.discountMultiplier,
        F: S.freightRatePerLengthEUR,
        CN: S.customsNumerator,
        CD: S.customsDenominator,
        WR: S.warrantyRate,
        COM: S.internalCommissionFactor,
        OFF: S.companyCostFactor,
        PF: S.profitFactor,
      },
      steps: {
        companyPrice,
        shipment,
        custom,
        warranty,
        subtotal,
        commission,
        office,
        sellPrice,
      },
    };
  }

  private async calculatePriceInternal(device: Device): Promise<number> {
    const breakdown = await this.calculateBreakdown(device);
    return breakdown.steps.sellPrice;
  }

  async getCategoriesSafe(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    return data.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.is_active,
    }));
  }

  async searchDevicesSafe(query: string, categoryId?: string): Promise<SafeDeviceDTO[]> {
    let queryBuilder = supabase
      .from('devices')
      .select('id, model_name, category_id, categories(name)')
      .eq('is_active', true);

    if (categoryId && categoryId !== 'all') {
      queryBuilder = queryBuilder.eq('category_id', categoryId);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    let result = data || [];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((d) => d.model_name.toLowerCase().includes(q));
    }

    return result.map((d) => ({
      id: d.id,
      modelName: d.model_name,
      categoryId: d.category_id,
      categoryName: d.categories?.name || 'Unknown',
    }));
  }

  async createProject(userId: string, name: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert([{ name, user_id: userId }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      userId: data.user_id,
      createdAt: new Date(data.created_at).getTime(),
    };
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((p) => ({
      id: p.id,
      name: p.name,
      userId: p.user_id,
      createdAt: new Date(p.created_at).getTime(),
    }));
  }

  async addComment(projectId: string, userId: string, content: string): Promise<Comment> {
    const { data: user } = await supabase
      .from('users')
      .select('full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (!user) throw new Error('User not found');

    const { data, error } = await supabase
      .from('comments')
      .insert([{ project_id: projectId, user_id: userId, content }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      projectId: data.project_id,
      userId: data.user_id,
      userFullName: user.full_name,
      role: user.role as 'admin' | 'employee',
      content: data.content,
      timestamp: new Date(data.created_at).getTime(),
      isRead: data.is_read,
    };
  }

  async getProjectComments(projectId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users(full_name, role)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map((c) => ({
      id: c.id,
      projectId: c.project_id,
      userId: c.user_id,
      userFullName: c.users?.full_name || 'Unknown',
      role: c.users?.role as 'admin' | 'employee',
      content: c.content,
      timestamp: new Date(c.created_at).getTime(),
      isRead: c.is_read,
    }));
  }

  async markCommentsAsRead(projectId: string, readerRole: 'admin' | 'employee') {
    const targetRole = readerRole === 'admin' ? 'employee' : 'admin';

    const { data: commentsToUpdate } = await supabase
      .from('comments')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_read', false)
      .in('user_id',
        (await supabase.from('users').select('id').eq('role', targetRole)).data?.map(u => u.id) || []
      );

    if (commentsToUpdate && commentsToUpdate.length > 0) {
      await supabase
        .from('comments')
        .update({ is_read: true })
        .in('id', commentsToUpdate.map(c => c.id));
    }
  }

  async getUnreadCommentsCountForUser(userId: string): Promise<number> {
    const { data: userProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    const projectIds = userProjects?.map(p => p.id) || [];

    const { data: unreadComments, error } = await supabase
      .from('comments')
      .select('id', { count: 'exact' })
      .in('project_id', projectIds)
      .eq('is_read', false)
      .in('user_id',
        (await supabase.from('users').select('id').eq('role', 'admin')).data?.map(u => u.id) || []
      );

    if (error) throw error;

    return unreadComments?.length || 0;
  }

  async requestPrice(userId: string, deviceId: string, projectId: string): Promise<RequestStatusDTO> {
    const { data: device } = await supabase
      .from('devices')
      .select('*, categories(name)')
      .eq('id', deviceId)
      .maybeSingle();

    if (!device) throw new Error('Device not found');

    const { data: existingPending } = await supabase
      .from('inquiry_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      return {
        requestId: existingPending.id,
        deviceId: existingPending.device_id,
        projectId: existingPending.project_id,
        status: existingPending.status,
        sellPriceEUR: null,
        timestamp: new Date(existingPending.created_at).getTime(),
      };
    }

    const deviceForCalc: Device = {
      id: device.id,
      modelName: device.model_name,
      categoryId: device.category_id,
      isActive: device.is_active,
      factoryPriceEUR: device.factory_price_eur,
      length: device.length,
      weight: device.weight,
    };

    const priceEUR = await this.calculatePriceInternal(deviceForCalc);

    const { data: newLog, error } = await supabase
      .from('inquiry_logs')
      .insert([
        {
          user_id: userId,
          device_id: deviceId,
          project_id: projectId,
          category_name_snapshot: device.categories?.name || 'Unknown',
          model_name_snapshot: device.model_name,
          sell_price_eur_snapshot: priceEUR,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      requestId: newLog.id,
      deviceId: newLog.device_id,
      projectId: newLog.project_id,
      status: 'pending',
      sellPriceEUR: null,
      timestamp: new Date(newLog.created_at).getTime(),
    };
  }

  async getUserRequests(userId: string): Promise<RequestStatusDTO[]> {
    const { data, error } = await supabase
      .from('inquiry_logs')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return data.map((log) => ({
      requestId: log.id,
      deviceId: log.device_id,
      projectId: log.project_id,
      status: log.status,
      sellPriceEUR: log.status === 'approved' ? log.sell_price_eur_snapshot : null,
      timestamp: new Date(log.created_at).getTime(),
    }));
  }

  async getAdminData() {
    const [
      { data: users },
      { data: categories },
      { data: devices },
      { data: settings },
      { data: logs },
      { data: projects },
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('devices').select('*'),
      supabase.from('global_settings').select('*'),
      supabase.from('inquiry_logs').select('*'),
      supabase.from('projects').select('*'),
    ]);

    return {
      users: users?.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        role: u.role,
        isActive: u.is_active,
      })) || [],
      categories: categories?.map((c) => ({
        id: c.id,
        name: c.name,
        isActive: c.is_active,
      })) || [],
      devices: devices?.map((d) => ({
        id: d.id,
        modelName: d.model_name,
        categoryId: d.category_id,
        isActive: d.is_active,
        factoryPriceEUR: d.factory_price_eur,
        length: d.length,
        weight: d.weight,
      })) || [],
      settings: settings?.[0]
        ? {
            id: settings[0].id,
            isActive: settings[0].is_active,
            discountMultiplier: settings[0].discount_multiplier,
            freightRatePerLengthEUR: settings[0].freight_rate_per_length_eur,
            customsNumerator: settings[0].customs_numerator,
            customsDenominator: settings[0].customs_denominator,
            warrantyRate: settings[0].warranty_rate,
            internalCommissionFactor: settings[0].internal_commission_factor,
            companyCostFactor: settings[0].company_cost_factor,
            profitFactor: settings[0].profit_factor,
          }
        : null,
      logs: logs?.map((l) => ({
        id: l.id,
        userId: l.user_id,
        userFullName: l.user_id,
        deviceId: l.device_id,
        projectId: l.project_id,
        projectNameSnapshot: '',
        categoryNameSnapshot: l.category_name_snapshot,
        modelNameSnapshot: l.model_name_snapshot,
        sellPriceEURSnapshot: l.sell_price_eur_snapshot,
        timestamp: new Date(l.created_at).getTime(),
        status: l.status,
        adminResponseTime: l.admin_response_time
          ? new Date(l.admin_response_time).getTime()
          : undefined,
      })) || [],
      projects: projects?.map((p) => ({
        id: p.id,
        name: p.name,
        userId: p.user_id,
        createdAt: new Date(p.created_at).getTime(),
      })) || [],
    };
  }

  async getAdminProjectSummaries(): Promise<ProjectSummaryDTO[]> {
    const { data: projects } = await supabase.from('projects').select('*');
    const { data: comments } = await supabase.from('comments').select('*, users(role)');
    const { data: logs } = await supabase.from('inquiry_logs').select('*');

    if (!projects) return [];

    return projects
      .map((p) => {
        const pComments = (comments || []).filter((c) => c.project_id === p.id);
        const unreadCount = pComments.filter(
          (c) => c.users?.role === 'employee' && !c.is_read
        ).length;
        const lastCommentTime =
          pComments.length > 0
            ? new Date(pComments[pComments.length - 1].created_at).getTime()
            : 0;
        const lastLogTime =
          (logs || []).find((l) => l.project_id === p.id)?.created_at || 0;

        return {
          id: p.id,
          name: p.name,
          userId: p.user_id,
          createdAt: new Date(p.created_at).getTime(),
          unreadCount,
          lastActivity: Math.max(
            new Date(p.created_at).getTime(),
            lastCommentTime,
            typeof lastLogTime === 'string'
              ? new Date(lastLogTime).getTime()
              : lastLogTime
          ),
        };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  async getDeviceBreakdown(deviceId: string): Promise<PriceBreakdown> {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .maybeSingle();

    if (error || !data) throw new Error('Device not found');

    const device: Device = {
      id: data.id,
      modelName: data.model_name,
      categoryId: data.category_id,
      isActive: data.is_active,
      factoryPriceEUR: data.factory_price_eur,
      length: data.length,
      weight: data.weight,
    };

    return this.calculateBreakdown(device);
  }

  async updateSettings(newSettings: GlobalSettings) {
    const { error } = await supabase
      .from('global_settings')
      .update({
        is_active: newSettings.isActive,
        discount_multiplier: newSettings.discountMultiplier,
        freight_rate_per_length_eur: newSettings.freightRatePerLengthEUR,
        customs_numerator: newSettings.customsNumerator,
        customs_denominator: newSettings.customsDenominator,
        warranty_rate: newSettings.warrantyRate,
        internal_commission_factor: newSettings.internalCommissionFactor,
        company_cost_factor: newSettings.companyCostFactor,
        profit_factor: newSettings.profitFactor,
      })
      .eq('id', newSettings.id);

    if (error) throw error;
  }

  async updateDevice(device: Device) {
    const { error } = await supabase.from('devices').upsert({
      id: device.id,
      model_name: device.modelName,
      category_id: device.categoryId,
      is_active: device.isActive,
      factory_price_eur: device.factoryPriceEUR,
      length: device.length,
      weight: device.weight,
    });

    if (error) throw error;
  }

  async deleteDevice(id: string) {
    const { error } = await supabase.from('devices').delete().eq('id', id);

    if (error) throw error;
  }

  async saveCategory(category: Category) {
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      is_active: category.isActive,
    });

    if (error) throw error;
  }

  async deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) throw error;
  }

  async saveUser(user: User) {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      username: user.username,
      password: user.password,
      full_name: user.fullName,
      role: user.role,
      is_active: user.isActive,
    });

    if (error) throw error;
  }

  async deleteUser(id: string) {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .maybeSingle();

    if (user?.role === 'admin') {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length <= 1) throw new Error('Cannot delete the last admin');
    }

    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) throw error;
  }

  async setRequestStatus(logId: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('inquiry_logs')
      .update({ status, admin_response_time: new Date().toISOString() })
      .eq('id', logId);

    if (error) throw error;
  }
}

export const backend = new SupabaseBackendService();
