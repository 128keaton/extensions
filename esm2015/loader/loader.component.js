import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input, ChangeDetectorRef, } from '@angular/core';
export class MtxLoaderComponent {
    constructor(_changeDetectorRef) {
        this._changeDetectorRef = _changeDetectorRef;
        this.type = 'spinner';
        this.loading = true;
        this.color = 'primary';
        this.mode = 'indeterminate';
        this.value = 0;
        this.strokeWidth = 4; // only support spinner
        this.diameter = 48; // only support spinner
        this.bufferValue = 0; // only support progresbar
        this.hasBackdrop = true;
    }
}
MtxLoaderComponent.decorators = [
    { type: Component, args: [{
                selector: 'mtx-loader',
                exportAs: 'mtxLoader',
                host: {
                    'class': 'mtx-loader',
                    '[class.mtx-loader-loading]': 'loading',
                },
                template: "<div class=\"mtx-loader-backdrop\" *ngIf=\"loading && hasBackdrop\"></div>\r\n<div class=\"mtx-loader-main\" *ngIf=\"loading\">\r\n  <mat-spinner *ngIf=\"type==='spinner'\"\r\n               [color]=\"color\"\r\n               [strokeWidth]=\"strokeWidth\"\r\n               [diameter]=\"diameter\"\r\n               [mode]=\"$any(mode)\"\r\n               [value]=\"value\">\r\n  </mat-spinner>\r\n\r\n  <mat-progress-bar *ngIf=\"type==='progressbar'\"\r\n                    [color]=\"color\"\r\n                    [mode]=\"$any(mode)\"\r\n                    [value]=\"value\"\r\n                    [bufferValue]=\"bufferValue\">\r\n  </mat-progress-bar>\r\n</div>\r\n<ng-content></ng-content>\r\n",
                encapsulation: ViewEncapsulation.None,
                changeDetection: ChangeDetectionStrategy.OnPush,
                styles: [".mtx-loader{position:relative;display:block;width:100%;height:100%}.mtx-loader-main{position:absolute;top:0;left:0;z-index:2;display:flex;justify-content:center;align-items:center;width:100%;height:100%}.mtx-loader-main .mat-spinner{position:relative}.mtx-loader-backdrop,.mtx-loader-main .mat-progress-bar{position:absolute;top:0;left:0;width:100%}.mtx-loader-backdrop{display:block;z-index:1;height:100%;content:\"\"}"]
            },] }
];
/** @nocollapse */
MtxLoaderComponent.ctorParameters = () => [
    { type: ChangeDetectorRef }
];
MtxLoaderComponent.propDecorators = {
    type: [{ type: Input }],
    loading: [{ type: Input }],
    color: [{ type: Input }],
    mode: [{ type: Input }],
    value: [{ type: Input }],
    strokeWidth: [{ type: Input }],
    diameter: [{ type: Input }],
    bufferValue: [{ type: Input }],
    hasBackdrop: [{ type: Input }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVyLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2V4dGVuc2lvbnMvbG9hZGVyL2xvYWRlci5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLFNBQVMsRUFDVCx1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLEtBQUssRUFDTCxpQkFBaUIsR0FDbEIsTUFBTSxlQUFlLENBQUM7QUFtQnZCLE1BQU0sT0FBTyxrQkFBa0I7SUFXN0IsWUFBb0Isa0JBQXFDO1FBQXJDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBbUI7UUFWaEQsU0FBSSxHQUFrQixTQUFTLENBQUM7UUFDaEMsWUFBTyxHQUFHLElBQUksQ0FBQztRQUNmLFVBQUssR0FBaUIsU0FBUyxDQUFDO1FBQ2hDLFNBQUksR0FBMEMsZUFBZSxDQUFDO1FBQzlELFVBQUssR0FBRyxDQUFDLENBQUM7UUFDVixnQkFBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLHVCQUF1QjtRQUN4QyxhQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsdUJBQXVCO1FBQ3RDLGdCQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO1FBQzNDLGdCQUFXLEdBQUcsSUFBSSxDQUFDO0lBRWdDLENBQUM7OztZQXZCOUQsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSxZQUFZO2dCQUN0QixRQUFRLEVBQUUsV0FBVztnQkFDckIsSUFBSSxFQUFFO29CQUNKLE9BQU8sRUFBRSxZQUFZO29CQUNyQiw0QkFBNEIsRUFBRSxTQUFTO2lCQUN4QztnQkFDRCwwc0JBQXNDO2dCQUV0QyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsSUFBSTtnQkFDckMsZUFBZSxFQUFFLHVCQUF1QixDQUFDLE1BQU07O2FBQ2hEOzs7O1lBbkJDLGlCQUFpQjs7O21CQXFCaEIsS0FBSztzQkFDTCxLQUFLO29CQUNMLEtBQUs7bUJBQ0wsS0FBSztvQkFDTCxLQUFLOzBCQUNMLEtBQUs7dUJBQ0wsS0FBSzswQkFDTCxLQUFLOzBCQUNMLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG4gIENvbXBvbmVudCxcclxuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcclxuICBWaWV3RW5jYXBzdWxhdGlvbixcclxuICBJbnB1dCxcclxuICBDaGFuZ2VEZXRlY3RvclJlZixcclxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgVGhlbWVQYWxldHRlIH0gZnJvbSAnQGFuZ3VsYXIvbWF0ZXJpYWwvY29yZSc7XHJcbmltcG9ydCB7IFByb2dyZXNzQmFyTW9kZSB9IGZyb20gJ0Bhbmd1bGFyL21hdGVyaWFsL3Byb2dyZXNzLWJhcic7XHJcbmltcG9ydCB7IFByb2dyZXNzU3Bpbm5lck1vZGUgfSBmcm9tICdAYW5ndWxhci9tYXRlcmlhbC9wcm9ncmVzcy1zcGlubmVyJztcclxuXHJcbmV4cG9ydCB0eXBlIE10eExvYWRlclR5cGUgPSAnc3Bpbm5lcicgfCAncHJvZ3Jlc3NiYXInO1xyXG5cclxuQENvbXBvbmVudCh7XHJcbiAgc2VsZWN0b3I6ICdtdHgtbG9hZGVyJyxcclxuICBleHBvcnRBczogJ210eExvYWRlcicsXHJcbiAgaG9zdDoge1xyXG4gICAgJ2NsYXNzJzogJ210eC1sb2FkZXInLFxyXG4gICAgJ1tjbGFzcy5tdHgtbG9hZGVyLWxvYWRpbmddJzogJ2xvYWRpbmcnLFxyXG4gIH0sXHJcbiAgdGVtcGxhdGVVcmw6ICcuL2xvYWRlci5jb21wb25lbnQuaHRtbCcsXHJcbiAgc3R5bGVVcmxzOiBbJy4vbG9hZGVyLmNvbXBvbmVudC5zY3NzJ10sXHJcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcclxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcclxufSlcclxuZXhwb3J0IGNsYXNzIE10eExvYWRlckNvbXBvbmVudCB7XHJcbiAgQElucHV0KCkgdHlwZTogTXR4TG9hZGVyVHlwZSA9ICdzcGlubmVyJztcclxuICBASW5wdXQoKSBsb2FkaW5nID0gdHJ1ZTtcclxuICBASW5wdXQoKSBjb2xvcjogVGhlbWVQYWxldHRlID0gJ3ByaW1hcnknO1xyXG4gIEBJbnB1dCgpIG1vZGU6IFByb2dyZXNzU3Bpbm5lck1vZGUgfCBQcm9ncmVzc0Jhck1vZGUgPSAnaW5kZXRlcm1pbmF0ZSc7XHJcbiAgQElucHV0KCkgdmFsdWUgPSAwO1xyXG4gIEBJbnB1dCgpIHN0cm9rZVdpZHRoID0gNDsgLy8gb25seSBzdXBwb3J0IHNwaW5uZXJcclxuICBASW5wdXQoKSBkaWFtZXRlciA9IDQ4OyAvLyBvbmx5IHN1cHBvcnQgc3Bpbm5lclxyXG4gIEBJbnB1dCgpIGJ1ZmZlclZhbHVlID0gMDsgLy8gb25seSBzdXBwb3J0IHByb2dyZXNiYXJcclxuICBASW5wdXQoKSBoYXNCYWNrZHJvcCA9IHRydWU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX2NoYW5nZURldGVjdG9yUmVmOiBDaGFuZ2VEZXRlY3RvclJlZikge31cclxufVxyXG4iXX0=