export interface MapData {
  id: number;
  lat: string;
  lon: string;
  tags: {
    [key: string]: string;
  };
};
export interface MapDataObject {
  [key: string]: MapData;
};