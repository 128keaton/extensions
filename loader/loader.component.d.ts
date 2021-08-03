import { ChangeDetectorRef } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import { ProgressBarMode } from '@angular/material/progress-bar';
import { ProgressSpinnerMode } from '@angular/material/progress-spinner';
export declare type MtxLoaderType = 'spinner' | 'progressbar';
export declare class MtxLoaderComponent {
    private _changeDetectorRef;
    type: MtxLoaderType;
    loading: boolean;
    color: ThemePalette;
    mode: ProgressSpinnerMode | ProgressBarMode;
    value: number;
    strokeWidth: number;
    diameter: number;
    bufferValue: number;
    hasBackdrop: boolean;
    constructor(_changeDetectorRef: ChangeDetectorRef);
}
