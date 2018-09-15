import { Plugin } from "../../types/options";
export interface ExtraFields {
    monthStartDay: number;
    monthEndDay: number;
}
declare function monthSelectPlugin(): Plugin<ExtraFields>;
export default monthSelectPlugin;
