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
