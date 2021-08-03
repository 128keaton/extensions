export declare type MtxProgressType = 'default' | 'info' | 'success' | 'warning' | 'danger';
export declare class MtxProgressComponent {
    /** The progress type */
    type: MtxProgressType;
    /** The progress value */
    value: number;
    /** The progress height */
    height: string;
    /** The progress text color */
    color: string;
    /** The progress bar color */
    foreground: string;
    /** The progress track color */
    background: string;
    /** Whether applies striped class */
    striped: boolean;
    /** Whether applies animated class */
    animate: boolean;
}
