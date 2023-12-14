export const UNIT = 10**12; // ROC has 12 decimals

export const INITIAL_PRICE = 50 * UNIT;
export const CORE_COUNT = 10;
export const TIMESLICE = 80; // one TIMESLICE is 80 relay chain blocks.
export const TIMESLICE_PERIOD = 2; // one para block has a duration of two relay chain blocks.

export const FULL_MASK = "0xFFFFFFFFFFFFFFFFFFFF"; // hex encoded 80 bit bitmap.
export const HALF_FULL_MASK = "0xFFFFFFFFFF0000000000"; // hex encoded 80 bit bitmap.

export const CONFIG = {
    advance_notice: 20,
    interlude_length: 10,
    leadin_length: 10,
    ideal_bulk_proportion: 0,
    limit_cores_offered: 50,
    region_length: 30,
    renewal_bump: 10,
    contribution_timeout: 5,
}
