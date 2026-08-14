import { supabase } from './SupabaseClient';

export type RoutingMap = Record<string, string>;

const defaultOperationsMap: RoutingMap = {
  'Soft Copy of Certificate': 'Gemalyn Cabral',
  'Hard Copy of Certificate': 'Angeline Villanueva',
  'Shopee Courier/ Delivery': 'Angeline Villanueva',
  'Enrollment/ Post-test': 'Arvin Lim',
  'Other Operations concerns': 'Paul Alado'
};

const defaultMaps: Record<string, RoutingMap> = {
  'Operations': defaultOperationsMap,
  'Finance': { 'Refund Request': '', 'Payment Error': '', 'Invoice Inquiry': '' },
  'Marketing': { 'Current Promos': '', 'Social Media': '', 'Campaigns': '' },
  'HR': { 'Job Application': '', 'Interview Status': '', 'Employee Relations': '' },
  'IT Support': { 'App Crashing': '', 'Login Issues': '', 'Bug Report': '' },
  'Sales': { 'Product Demo': '', 'Pricing Inquiry': '', 'Bulk Orders': '' },
  'Business Development': { 'B2B Partnership': '', 'Sponsorship': '', 'Vendor Inquiry': '' }
};

const departmentEmails: Record<string, string> = {
  'Sales': 'alco.sales@gmail.com',
  'Finance': 'atsocafinance@gmail.com',
  'Operations': 'atsoca.operations@gmail.com',
  'IT Support': 'atsoca.tech@gmail.com',
  'Marketing': 'atsoca.marketing@gmail.com',
  'Business Development': 'bdd.alco@gmail.com',
  'HR': 'atsoca.tech@gmail.com', // Fallback for now until provided
  'Master': 'admin@atsoca.com'
};

export class RoutingService {
  static getDepartmentEmail(department: string): string {
    return departmentEmails[department] || 'atsoca.tech@gmail.com';
  }
  static async getMappings(department: string): Promise<RoutingMap> {
    const { data, error } = await supabase
      .from('routing')
      .select('mappings')
      .eq('department', department)
      .single();

    if (error || !data) {
      return defaultMaps[department] || {};
    }
    
    return data.mappings as RoutingMap;
  }

  static async getAssignee(department: string, concern: string): Promise<string> {
    const mappings = await this.getMappings(department);
    return mappings[concern] || '';
  }

  static async updateMappings(department: string, newMappings: RoutingMap): Promise<void> {
    const { error } = await supabase
      .from('routing')
      .update({ mappings: newMappings })
      .eq('department', department);
      
    if (error) {
      console.error('Error updating routing:', error);
    }
  }
}
