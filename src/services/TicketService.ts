import { Ticket } from '../types';
import { supabase } from './SupabaseClient';

export class TicketService {
  static async getTickets(): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
    return data as Ticket[];
  }

  static async getTicket(id: string): Promise<Ticket | undefined> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return undefined;
    }
    return data as Ticket;
  }

  static async createTicket(ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tickets_updated'));
    }
    
    return data as Ticket;
  }

  static async updateTicketStatus(id: string, newStatus: Ticket['status']): Promise<void> {
    await this.updateTicket(id, { status: newStatus });
  }

  static async updateTicket(id: string, updates: Partial<Ticket>): Promise<void> {
    const { error } = await supabase
      .from('tickets')
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq('id', id);
      
    if (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tickets_updated'));
    }
  }
}
