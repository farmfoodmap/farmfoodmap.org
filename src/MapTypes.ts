export interface MapData {
  id: number;
  lat: number;
  lon: number;
  tags: {
    [key: string]: string;
  };
}
export interface MapDataObject {
  [key: string]: MapData;
}
