export type ProjectStatus =
  | 'interview'
  | 'strategy'
  | 'generating'
  | 'review'
  | 'completed';

export type Language = 'nl' | 'en';

export type Archetype =
  | 'service_zzp'
  | 'lokale_ambacht'
  | 'visueel_portfolio'
  | 'horeca'
  | 'webshop'
  | 'boeking_gedreven';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  business_name: string | null;
  archetype: Archetype | null;
  sub_archetype: Archetype | null;
  language: Language;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}
