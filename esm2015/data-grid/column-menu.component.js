import { Component, Input, ViewEncapsulation, ChangeDetectionStrategy, Output, EventEmitter, TemplateRef, ViewChild, } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
export class MtxGridColumnMenuComponent {
    constructor() {
        this.columns = [];
        this.selectable = true;
        this.selectableChecked = 'show';
        this.sortable = true;
        this.dndSortable = true;
        this._buttonText = '';
        this.buttonType = 'stroked';
        this.buttonClass = '';
        this.buttonIcon = '';
        this.showHeader = false;
        this.headerText = 'Columns Header';
        this.showFooter = false;
        this.footerText = 'Columns Footer';
        this.selectionChange = new EventEmitter();
        this.sortChange = new EventEmitter();
    }
    get buttonText() {
        const defaultText = `Columns ${this.selectableChecked === 'show' ? 'Shown' : 'Hidden'}`;
        const text = this._buttonText ? this._buttonText : defaultText;
        return text;
    }
    set buttonText(value) {
        this._buttonText = value;
    }
    _handleDroped(event) {
        moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
        this.sortChange.emit(this.columns);
    }
    _handleSelection(e) {
        this.selectionChange.emit(this.columns);
    }
}
MtxGridColumnMenuComponent.decorators = [
    { type: Component, args: [{
                selector: 'mtx-grid-column-menu',
                exportAs: 'mtxGridColumnMenu',
                template: "<ng-container [ngSwitch]=\"buttonType\">\r\n  <ng-container *ngSwitchCase=\"'raised'\">\r\n    <button [ngClass]=\"buttonClass\" mat-raised-button [color]=\"buttonColor\"\r\n            [matMenuTriggerFor]=\"menu\">\r\n      <mat-icon *ngIf=\"buttonIcon\">{{buttonIcon}}</mat-icon> {{buttonText}}\r\n    </button>\r\n  </ng-container>\r\n  <ng-container *ngSwitchCase=\"'stroked'\">\r\n    <button [ngClass]=\"buttonClass\" mat-stroked-button [color]=\"buttonColor\"\r\n            [matMenuTriggerFor]=\"menu\">\r\n      <mat-icon *ngIf=\"buttonIcon\">{{buttonIcon}}</mat-icon> {{buttonText}}\r\n    </button>\r\n  </ng-container>\r\n  <ng-container *ngSwitchCase=\"'flat'\">\r\n    <button [ngClass]=\"buttonClass\" mat-flat-button [color]=\"buttonColor\"\r\n            [matMenuTriggerFor]=\"menu\">\r\n      <mat-icon *ngIf=\"buttonIcon\">{{buttonIcon}}</mat-icon> {{buttonText}}\r\n    </button>\r\n  </ng-container>\r\n  <ng-container *ngSwitchCase=\"'icon'\">\r\n    <button [ngClass]=\"buttonClass\" mat-icon-button [color]=\"buttonColor\"\r\n            [matMenuTriggerFor]=\"menu\">\r\n      <mat-icon *ngIf=\"buttonIcon\">{{buttonIcon}}</mat-icon>\r\n    </button>\r\n  </ng-container>\r\n  <ng-container *ngSwitchCase=\"'fab'\">\r\n    <button [ngClass]=\"buttonClass\" mat-fab [color]=\"buttonColor\" [matMenuTriggerFor]=\"menu\">\r\n      <mat-icon *ngIf=\"buttonIcon\">{{buttonIcon}}</mat-icon> {{buttonText}}\r\n    </button>\r\n  </ng-container>\r\n  <ng-container *ngSwitchCase=\"'mini-fab'\">\r\n    <button [ngClass]=\"buttonClass\" mat-mini-fab [color]=\"buttonColor\"\r\n            [matMenuTriggerFor]=\"menu\">\r\n      <mat-icon *ngIf=\"buttonIcon\">{{buttonIcon}}</mat-icon> {{buttonText}}\r\n    </button>\r\n  </ng-container>\r\n  <ng-container *ngSwitchDefault>\r\n    <button [ngClass]=\"buttonClass\" mat-button [color]=\"buttonColor\" [matMenuTriggerFor]=\"menu\">\r\n      <mat-icon *ngIf=\"buttonIcon\">{{buttonIcon}}</mat-icon> {{buttonText}}\r\n    </button>\r\n  </ng-container>\r\n</ng-container>\r\n\r\n<mat-menu #menu=\"matMenu\" class=\"mtx-grid-column-menu\">\r\n  <div class=\"mtx-grid-column-menu-content\"\r\n       (click)=\"$event.stopPropagation()\" (keydown)=\"$event.stopPropagation()\">\r\n    <div class=\"mtx-grid-column-menu-header\" *ngIf=\"showHeader\">\r\n      <ng-template [ngIf]=\"headerTemplate\" [ngIfElse]=\"defaultHeaderTpl\">\r\n        <ng-template [ngTemplateOutlet]=\"headerTemplate\"></ng-template>\r\n      </ng-template>\r\n      <ng-template #defaultHeaderTpl>{{headerText}}</ng-template>\r\n    </div>\r\n\r\n    <div class=\"mtx-grid-column-menu-body\">\r\n      <div class=\"mtx-grid-column-menu-list\"\r\n           cdkDropList (cdkDropListDropped)=\"_handleDroped($event)\"\r\n           *ngIf=\"sortable\">\r\n        <div class=\"mtx-grid-column-menu-item\" *ngFor=\"let col of columns\"\r\n             cdkDrag [cdkDragDisabled]=\"selectableChecked === 'show'? !col.show : col.hide\">\r\n          <mat-icon cdkDragHandle>drag_handle</mat-icon>\r\n          <ng-template [ngTemplateOutlet]=\"checkboxList\"\r\n                       [ngTemplateOutletContext]=\"{ $implicit: col }\">\r\n          </ng-template>\r\n        </div>\r\n      </div>\r\n\r\n      <div class=\"mtx-grid-column-menu-list\" *ngIf=\"!sortable\">\r\n        <div class=\"mtx-grid-column-menu-item\" *ngFor=\"let col of columns\">\r\n          <ng-template [ngTemplateOutlet]=\"checkboxList\"\r\n                       [ngTemplateOutletContext]=\"{ $implicit: col }\">\r\n          </ng-template>\r\n        </div>\r\n      </div>\r\n    </div>\r\n\r\n    <div class=\"mtx-grid-column-menu-footer\" *ngIf=\"showFooter\">\r\n      <ng-template [ngIf]=\"footerTemplate\" [ngIfElse]=\"defaultFooterTpl\">\r\n        <ng-template [ngTemplateOutlet]=\"footerTemplate\"></ng-template>\r\n      </ng-template>\r\n      <ng-template #defaultFooterTpl>{{footerText}}</ng-template>\r\n    </div>\r\n  </div>\r\n</mat-menu>\r\n\r\n<ng-template #checkboxList let-col>\r\n  <mat-checkbox class=\"mtx-grid-column-menu-item-label\"\r\n                *ngIf=\"selectable\"\r\n                [(ngModel)]=\"col[selectableChecked]\"\r\n                [disabled]=\"col.disabled\"\r\n                (change)=\"_handleSelection($event)\">\r\n    {{col.label | toObservable | async}}\r\n  </mat-checkbox>\r\n  <span class=\"mtx-grid-column-menu-item-label\" *ngIf=\"!selectable\">\r\n    {{col.label | toObservable | async}}\r\n  </span>\r\n</ng-template>\r\n",
                encapsulation: ViewEncapsulation.None,
                changeDetection: ChangeDetectionStrategy.OnPush,
                styles: [".mtx-grid-column-menu .mat-menu-content{padding:0}.mtx-grid-column-menu-body{padding:16px}.mtx-grid-column-menu-footer,.mtx-grid-column-menu-header{position:sticky;z-index:1;padding:8px 16px}.mtx-grid-column-menu-header{top:0}.mtx-grid-column-menu-footer{bottom:0}.mtx-grid-column-menu-list{display:block;max-width:100%}.mtx-grid-column-menu-list.cdk-drop-list-dragging .mtx-grid-column-menu-item:not(.cdk-drag-placeholder){transition:transform .25s cubic-bezier(0,0,.2,1)}.mtx-grid-column-menu-list.cdk-drop-list .mtx-grid-column-menu-item-label{padding:0 4px}.mtx-grid-column-menu-item{display:flex;flex-direction:row;align-items:center;padding:4px 0}.mtx-grid-column-menu-item.cdk-drag-disabled .cdk-drag-handle{opacity:.35;cursor:no-drop}.mtx-grid-column-menu-item .cdk-drag-handle{cursor:move}.mtx-grid-column-menu-item.cdk-drag-preview{box-shadow:0 3px 1px -2px rgba(0,0,0,.2),0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12)}.mtx-grid-column-menu-item.cdk-drag-placeholder{opacity:0}.mtx-grid-column-menu-item.cdk-drag-animating{transition:transform .25s cubic-bezier(0,0,.2,1)}"]
            },] }
];
MtxGridColumnMenuComponent.propDecorators = {
    menuPanel: [{ type: ViewChild, args: ['menu', { static: true },] }],
    menuTrigger: [{ type: ViewChild, args: [MatMenuTrigger,] }],
    columns: [{ type: Input }],
    selectable: [{ type: Input }],
    selectableChecked: [{ type: Input }],
    sortable: [{ type: Input }],
    dndSortable: [{ type: Input }],
    buttonText: [{ type: Input }],
    buttonType: [{ type: Input }],
    buttonColor: [{ type: Input }],
    buttonClass: [{ type: Input }],
    buttonIcon: [{ type: Input }],
    showHeader: [{ type: Input }],
    headerText: [{ type: Input }],
    headerTemplate: [{ type: Input }],
    showFooter: [{ type: Input }],
    footerText: [{ type: Input }],
    footerTemplate: [{ type: Input }],
    selectionChange: [{ type: Output }],
    sortChange: [{ type: Output }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sdW1uLW1lbnUuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvZXh0ZW5zaW9ucy9kYXRhLWdyaWQvY29sdW1uLW1lbnUuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCxTQUFTLEVBQ1QsS0FBSyxFQUNMLGlCQUFpQixFQUNqQix1QkFBdUIsRUFDdkIsTUFBTSxFQUNOLFlBQVksRUFDWixXQUFXLEVBQ1gsU0FBUyxHQUNWLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUV0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBWWpFLE1BQU0sT0FBTywwQkFBMEI7SUFSdkM7UUFZVyxZQUFPLEdBQWlDLEVBQUUsQ0FBQztRQUMzQyxlQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLHNCQUFpQixHQUFvQixNQUFNLENBQUM7UUFDNUMsYUFBUSxHQUFHLElBQUksQ0FBQztRQUNoQixnQkFBVyxHQUFHLElBQUksQ0FBQztRQVdwQixnQkFBVyxHQUFHLEVBQUUsQ0FBQztRQUVoQixlQUFVLEdBQXNCLFNBQVMsQ0FBQztRQUUxQyxnQkFBVyxHQUFHLEVBQUUsQ0FBQztRQUNqQixlQUFVLEdBQUcsRUFBRSxDQUFDO1FBRWhCLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFDbkIsZUFBVSxHQUFHLGdCQUFnQixDQUFDO1FBRTlCLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFDbkIsZUFBVSxHQUFHLGdCQUFnQixDQUFDO1FBRzdCLG9CQUFlLEdBQUcsSUFBSSxZQUFZLEVBQWdDLENBQUM7UUFDbkUsZUFBVSxHQUFHLElBQUksWUFBWSxFQUFnQyxDQUFDO0lBVTFFLENBQUM7SUFsQ0MsSUFDSSxVQUFVO1FBQ1osTUFBTSxXQUFXLEdBQUcsV0FBVyxJQUFJLENBQUMsaUJBQWlCLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUMvRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLFVBQVUsQ0FBQyxLQUFhO1FBQzFCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0lBQzNCLENBQUM7SUFrQkQsYUFBYSxDQUFDLEtBQTRCO1FBQ3hDLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsQ0FBb0I7UUFDbkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLENBQUM7OztZQW5ERixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLHNCQUFzQjtnQkFDaEMsUUFBUSxFQUFFLG1CQUFtQjtnQkFDN0IsczVJQUEyQztnQkFFM0MsYUFBYSxFQUFFLGlCQUFpQixDQUFDLElBQUk7Z0JBQ3JDLGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxNQUFNOzthQUNoRDs7O3dCQUVFLFNBQVMsU0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFOzBCQUNsQyxTQUFTLFNBQUMsY0FBYztzQkFFeEIsS0FBSzt5QkFDTCxLQUFLO2dDQUNMLEtBQUs7dUJBQ0wsS0FBSzswQkFDTCxLQUFLO3lCQUVMLEtBQUs7eUJBV0wsS0FBSzswQkFDTCxLQUFLOzBCQUNMLEtBQUs7eUJBQ0wsS0FBSzt5QkFFTCxLQUFLO3lCQUNMLEtBQUs7NkJBQ0wsS0FBSzt5QkFDTCxLQUFLO3lCQUNMLEtBQUs7NkJBQ0wsS0FBSzs4QkFFTCxNQUFNO3lCQUNOLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG4gIENvbXBvbmVudCxcclxuICBJbnB1dCxcclxuICBWaWV3RW5jYXBzdWxhdGlvbixcclxuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcclxuICBPdXRwdXQsXHJcbiAgRXZlbnRFbWl0dGVyLFxyXG4gIFRlbXBsYXRlUmVmLFxyXG4gIFZpZXdDaGlsZCxcclxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgQ2RrRHJhZ0Ryb3AsIG1vdmVJdGVtSW5BcnJheSB9IGZyb20gJ0Bhbmd1bGFyL2Nkay9kcmFnLWRyb3AnO1xyXG5pbXBvcnQgeyBNYXRDaGVja2JveENoYW5nZSB9IGZyb20gJ0Bhbmd1bGFyL21hdGVyaWFsL2NoZWNrYm94JztcclxuaW1wb3J0IHsgTWF0TWVudSwgTWF0TWVudVRyaWdnZXIgfSBmcm9tICdAYW5ndWxhci9tYXRlcmlhbC9tZW51JztcclxuaW1wb3J0IHsgVGhlbWVQYWxldHRlIH0gZnJvbSAnQGFuZ3VsYXIvbWF0ZXJpYWwvY29yZSc7XHJcbmltcG9ydCB7IE10eEdyaWRCdXR0b25UeXBlLCBNdHhHcmlkQ29sdW1uU2VsZWN0aW9uSXRlbSB9IGZyb20gJy4vZ3JpZC5pbnRlcmZhY2UnO1xyXG5cclxuQENvbXBvbmVudCh7XHJcbiAgc2VsZWN0b3I6ICdtdHgtZ3JpZC1jb2x1bW4tbWVudScsXHJcbiAgZXhwb3J0QXM6ICdtdHhHcmlkQ29sdW1uTWVudScsXHJcbiAgdGVtcGxhdGVVcmw6ICcuL2NvbHVtbi1tZW51LmNvbXBvbmVudC5odG1sJyxcclxuICBzdHlsZVVybHM6IFsnLi9jb2x1bW4tbWVudS5jb21wb25lbnQuc2NzcyddLFxyXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXHJcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBNdHhHcmlkQ29sdW1uTWVudUNvbXBvbmVudCB7XHJcbiAgQFZpZXdDaGlsZCgnbWVudScsIHsgc3RhdGljOiB0cnVlIH0pIG1lbnVQYW5lbCE6IE1hdE1lbnU7XHJcbiAgQFZpZXdDaGlsZChNYXRNZW51VHJpZ2dlcikgbWVudVRyaWdnZXIhOiBNYXRNZW51VHJpZ2dlcjtcclxuXHJcbiAgQElucHV0KCkgY29sdW1uczogTXR4R3JpZENvbHVtblNlbGVjdGlvbkl0ZW1bXSA9IFtdO1xyXG4gIEBJbnB1dCgpIHNlbGVjdGFibGUgPSB0cnVlO1xyXG4gIEBJbnB1dCgpIHNlbGVjdGFibGVDaGVja2VkOiAnc2hvdycgfCAnaGlkZScgPSAnc2hvdyc7XHJcbiAgQElucHV0KCkgc29ydGFibGUgPSB0cnVlO1xyXG4gIEBJbnB1dCgpIGRuZFNvcnRhYmxlID0gdHJ1ZTtcclxuXHJcbiAgQElucHV0KClcclxuICBnZXQgYnV0dG9uVGV4dCgpIHtcclxuICAgIGNvbnN0IGRlZmF1bHRUZXh0ID0gYENvbHVtbnMgJHt0aGlzLnNlbGVjdGFibGVDaGVja2VkID09PSAnc2hvdycgPyAnU2hvd24nIDogJ0hpZGRlbid9YDtcclxuICAgIGNvbnN0IHRleHQgPSB0aGlzLl9idXR0b25UZXh0ID8gdGhpcy5fYnV0dG9uVGV4dCA6IGRlZmF1bHRUZXh0O1xyXG4gICAgcmV0dXJuIHRleHQ7XHJcbiAgfVxyXG4gIHNldCBidXR0b25UZXh0KHZhbHVlOiBzdHJpbmcpIHtcclxuICAgIHRoaXMuX2J1dHRvblRleHQgPSB2YWx1ZTtcclxuICB9XHJcbiAgcHJpdmF0ZSBfYnV0dG9uVGV4dCA9ICcnO1xyXG5cclxuICBASW5wdXQoKSBidXR0b25UeXBlOiBNdHhHcmlkQnV0dG9uVHlwZSA9ICdzdHJva2VkJztcclxuICBASW5wdXQoKSBidXR0b25Db2xvcjogVGhlbWVQYWxldHRlO1xyXG4gIEBJbnB1dCgpIGJ1dHRvbkNsYXNzID0gJyc7XHJcbiAgQElucHV0KCkgYnV0dG9uSWNvbiA9ICcnO1xyXG5cclxuICBASW5wdXQoKSBzaG93SGVhZGVyID0gZmFsc2U7XHJcbiAgQElucHV0KCkgaGVhZGVyVGV4dCA9ICdDb2x1bW5zIEhlYWRlcic7XHJcbiAgQElucHV0KCkgaGVhZGVyVGVtcGxhdGUhOiBUZW1wbGF0ZVJlZjxhbnk+O1xyXG4gIEBJbnB1dCgpIHNob3dGb290ZXIgPSBmYWxzZTtcclxuICBASW5wdXQoKSBmb290ZXJUZXh0ID0gJ0NvbHVtbnMgRm9vdGVyJztcclxuICBASW5wdXQoKSBmb290ZXJUZW1wbGF0ZSE6IFRlbXBsYXRlUmVmPGFueT47XHJcblxyXG4gIEBPdXRwdXQoKSBzZWxlY3Rpb25DaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPE10eEdyaWRDb2x1bW5TZWxlY3Rpb25JdGVtW10+KCk7XHJcbiAgQE91dHB1dCgpIHNvcnRDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPE10eEdyaWRDb2x1bW5TZWxlY3Rpb25JdGVtW10+KCk7XHJcblxyXG4gIF9oYW5kbGVEcm9wZWQoZXZlbnQ6IENka0RyYWdEcm9wPHN0cmluZ1tdPikge1xyXG4gICAgbW92ZUl0ZW1JbkFycmF5KHRoaXMuY29sdW1ucywgZXZlbnQucHJldmlvdXNJbmRleCwgZXZlbnQuY3VycmVudEluZGV4KTtcclxuICAgIHRoaXMuc29ydENoYW5nZS5lbWl0KHRoaXMuY29sdW1ucyk7XHJcbiAgfVxyXG5cclxuICBfaGFuZGxlU2VsZWN0aW9uKGU6IE1hdENoZWNrYm94Q2hhbmdlKSB7XHJcbiAgICB0aGlzLnNlbGVjdGlvbkNoYW5nZS5lbWl0KHRoaXMuY29sdW1ucyk7XHJcbiAgfVxyXG59XHJcbiJdfQ==