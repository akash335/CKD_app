export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  created_at: string;
  is_read?: boolean | string | null;
  /** Local-only field – never sent to / from the server */
  status?: "sending" | "sent" | "failed";
}

export interface ChatConversation {
  id: string | null;
  doctor_id?: string;
  patient_id?: string;
  participant_id: string;
  participant_name: string;
  participant_image?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  is_online?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChatPeer {
  id: string;
  name: string;
  image?: string | null;
  role?: "doctor" | "patient";
}
