import { EventEmitter, ChangeDetectorRef } from '@angular/core';
export declare type MtxAlertType = 'default' | 'info' | 'success' | 'warning' | 'danger';
export declare class MtxAlertComponent {
    private _changeDetectorRef;
    get hostClassList(): string;
    /** The alert type */
    type: MtxAlertType;
    /** Whether alert visible */
    isOpen: boolean;
    /** Whether displays an inline "Close" button */
    dismissible: boolean;
    /** The alert text color */
    color: string;
    /** Material elevation */
    elevation: number;
    /** This event fires when alert closed, $event is an instance of Alert component */
    closed: EventEmitter<MtxAlertComponent>;
    constructor(_changeDetectorRef: ChangeDetectorRef);
    _onClosed(): void;
}
