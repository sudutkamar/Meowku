export type Household = { id: string; name?: string; timezone?: string };

export type Cat = {
  id: string;
  household_id: string;
  owner_id: string;
  name: string;
  age_months: number;
  breed: string | null;
  weight_kg: number | null;
  notes: string | null;
  sex: 'female' | 'male' | 'unknown';
  sterilized: boolean;
  birth_date: string | null;
  body_condition_score: number | null;
  microchip_number: string | null;
  allergies: string | null;
  photo_url: string | null;
  is_active: boolean;
};

export type LitterBox = {
  id: string;
  household_id: string;
  owner_id: string;
  name: string;
  location: string | null;
  status: 'clean' | 'needs_cleaning' | 'maintenance';
  last_cleaned_at: string | null;
  is_active: boolean;
};

export type CatalogItem = {
  id: string;
  household_id: string;
  created_by: string;
  name: string;
  category: string;
  notes: string;
  stock_quantity: number;
  stock_unit: string;
  is_active: boolean;
};
