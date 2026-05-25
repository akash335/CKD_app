"""Schemas for medication management API."""

from pydantic import BaseModel, Field


class MedicationInteraction(BaseModel):
    severe: list[str] = Field(default_factory=list)
    moderate: list[str] = Field(default_factory=list)
    none: list[str] = Field(default_factory=list)
    checked_at: str


class MedicationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    prescribing_doctor: str = Field(..., min_length=1, max_length=120)
    start_date: str
    end_date: str | None = None

    dose_amount: float
    unit: str
    route: str
    frequency: str

    custom_times: list[str] = Field(default_factory=list)
    schedule_times: list[str] = Field(default_factory=list)
    meal_links: dict[str, bool] = Field(default_factory=dict)

    quantity_on_hand: float
    refill_alert_threshold_days: int = 7

    pill_photo_name: str = ""
    is_phosphate_binder: bool = False

    interaction: MedicationInteraction
    override_log_at: str | None = None


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(MedicationBase):
    pass


class MedicationResponse(MedicationBase):
    id: str
    user_id: str
    created_at: str
    updated_at: str


class MedicationDeleteResponse(BaseModel):
    success: bool
    message: str
    medication_id: str


class MedicationPreferenceUpdate(BaseModel):
    breakfast: str
    lunch: str
    dinner: str


class MedicationPreferenceResponse(MedicationPreferenceUpdate):
    user_id: str
    updated_at: str
