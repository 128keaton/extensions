import { EventEmitter, ChangeDetectorRef, AfterViewInit, QueryList } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { ThemePalette } from '@angular/material/core';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MtxCheckboxGroupOption } from './checkbox-group.interface';
export declare class MtxCheckboxBase {
    label?: any;
    value?: any;
    constructor(label?: any, value?: any);
}
export declare class MtxCheckboxGroupComponent implements AfterViewInit, ControlValueAccessor {
    private _changeDetectorRef;
    _checkboxes: QueryList<MatCheckbox>;
    get items(): any[];
    set items(value: any[]);
    private _items;
    private _originalItems;
    bindLabel: string;
    bindValue: string;
    showSelectAll: boolean;
    selectAllLabel: string;
    get compareWith(): (o1: any, o2: any) => boolean;
    set compareWith(fn: (o1: any, o2: any) => boolean);
    private _compareWith;
    get disabled(): boolean;
    set disabled(value: boolean);
    private _disabled;
    change: EventEmitter<{
        model: MtxCheckboxGroupOption[];
        index: number;
    }>;
    selectAll: boolean;
    selectAllIndeterminate: boolean;
    color: ThemePalette;
    selectedItems: MtxCheckboxGroupOption[];
    _onChange: (value: MtxCheckboxGroupOption[]) => void;
    _onTouched: () => void;
    constructor(_changeDetectorRef: ChangeDetectorRef);
    ngAfterViewInit(): void;
    /**
     * Finds and selects and option based on its value.
     * @returns Option that has the corresponding value.
     */
    private _selectValue;
    /**
     * Sets the model value. Implemented as part of ControlValueAccessor.
     * @param value New value to be written to the model.
     */
    writeValue(value: any[]): void;
    /**
     * Registers a callback to be triggered when the model value changes.
     * Implemented as part of ControlValueAccessor.
     * @param fn Callback to be registered.
     */
    registerOnChange(fn: (value: MtxCheckboxGroupOption[]) => {}): void;
    /**
     * Registers a callback to be triggered when the control is touched.
     * Implemented as part of ControlValueAccessor.
     * @param fn Callback to be registered.
     */
    registerOnTouched(fn: () => {}): void;
    /**
     * Sets the disabled state of the control. Implemented as a part of ControlValueAccessor.
     * @param isDisabled Whether the control should be disabled.
     */
    setDisabledState(isDisabled: boolean): void;
    private _checkMasterCheckboxState;
    private _getSelectedItems;
    /** Handle normal checkbox toggle */
    _updateNormalCheckboxState(e: MatCheckboxChange, index: number): void;
    /** Handle master checkbox toggle */
    _updateMasterCheckboxState(e: MatCheckboxChange, index: number): void;
}
