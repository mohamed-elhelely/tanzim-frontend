export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff?: boolean;
  role?: string;
  company_id?: number;
  is_company_admin?: boolean;
}

export interface Company {
  id: number;
  name: string;
  code?: string;
  is_active: boolean;
  email?: string;
  phone?: string;
}

export interface Subscription {
  id: number;
  company: number;
  plan: number;
  status: string;
  start_date: string;
  end_date?: string;
  is_trial: boolean;
  modules?: string[];
  max_users?: number;
  current_users?: number;
}

export interface DropdownItem {
  id: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  code?: string;
  [key: string]: any;
}
