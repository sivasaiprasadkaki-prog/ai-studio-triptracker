
export interface Attachment {
  id: string;
  entry_id?: string;
  user_id?: string;
  file_path?: string;
  file_name: string;
  file_type: string;
  url?: string; // Generated signed/public URL for display
  data: string; // Base64 data for image display and storage
}

export interface Entry {
  id: string;
  user_id: string;
  type: 'in' | 'out';
  dateTime: string;
  details: string;
  amount: number;
  category: string;
  mode: string;
  attachments: Attachment[];
}

export interface Ledger {
  id: string;
  name: string;
  createdAt: number;
  entries: Entry[];
}

export type Theme = 'light' | 'dark';

export interface User {
  name: string;
  email: string;
  avatar: string;
}
