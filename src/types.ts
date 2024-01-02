export type Timeslice = number;
export type CoreIndex = number;
export type CoreMask = string;

export type Balance = number;

export type RegionId = {
  begin: Timeslice;
  core: CoreIndex;
  mask: CoreMask;
};

export type RegionRecord = {
  end: Timeslice;
  owner: string;
  paid: null | Balance;
};

export type Region = {
  regionId: RegionId;
  regionRecord: RegionRecord;
};

export const Id = {
  _enum: {
    U8: "u8",
    U16: "u16",
    U32: "u32",
    U64: "u64",
    U128: "u128",
  },
};
