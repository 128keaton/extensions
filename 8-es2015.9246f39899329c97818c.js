(window.webpackJsonp=window.webpackJsonp||[]).push([[8],{pq4U:function(e,t,o){"use strict";o.r(t),o.d(t,"DataGridDemoModule",(function(){return v}));var i=o("sEIs"),l=o("M0ag");const a=[{position:1,name:"Boron",tag:[{color:"red",value:[1,2]}],weight:10.811,symbol:"B",gender:"male",mobile:"13198765432",tele:"567891234",city:"Berlin",address:"Bernauer Str.111,13355",date:"1423456765768",website:"www.matero.com",company:"matero",email:"Boron@gmail.com",status:!1,cost:4},{position:2,name:"Helium",tag:[{color:"blue",value:[3,4]}],weight:8.0026,symbol:"He",gender:"female",mobile:"13034676675",tele:"80675432",city:"Shanghai",address:"88 Songshan Road",date:"1423456765768",website:"www.matero.com",company:"matero",email:"Helium@gmail.com",status:!0,cost:5},{position:3,name:"Nitrogen",tag:[{color:"yellow",value:[5,6]}],weight:14.0067,symbol:"N",gender:"male",mobile:"15811112222",tele:"345678912",city:"Sydney",address:"Circular Quay, Sydney NSW 2000",date:"1423456765768",website:"www.matero.com",company:"matero",email:"Nitrogen@gmail.com",status:!0,cost:2}];var n=o("EM62"),c=o("PBFl"),d=o("2kYt"),r=o("bFHC");let s=(()=>{class e{constructor(e){this.platformLocation=e,this.text="",this.id="",this.href=""}ngOnInit(){this.id=this.text.toLowerCase().split(" ").filter(e=>"&"!==e).join("-"),this.href=this.platformLocation.pathname+"#"+this.id}}return e.\u0275fac=function(t){return new(t||e)(n.Qb(d.D))},e.\u0275cmp=n.Kb({type:e,selectors:[["docs-heading"]],inputs:{text:"text"},decls:6,vars:3,consts:[[3,"id"],[1,"header-link",3,"href"]],template:function(e,t){1&e&&(n.Wb(0,"h2",0),n.Wb(1,"span"),n.Jc(2),n.Vb(),n.Wb(3,"a",1),n.Wb(4,"mat-icon"),n.Jc(5,"link"),n.Vb(),n.Vb(),n.Vb()),2&e&&(n.nc("id",t.id),n.Cb(2),n.Kc(t.text),n.Cb(1),n.nc("href",t.href,n.Ac))},directives:[r.a],encapsulation:2}),e})();var m=o("CGrA"),b=o("+Tre"),h=o("nIj0"),u=o("F1o0"),p=o("k8N0"),g=o("Y2X+");const f=["statusTpl"];function w(e,t){1&e&&n.Jc(0),2&e&&n.Lc(" ",t.$implicit.name,"\n")}function C(e,t){1&e&&(n.Wb(0,"mat-slide-toggle",42),n.Jc(1,"Slide me!"),n.Vb()),2&e&&n.nc("checked",t.$implicit.status)}function x(e,t){if(1&e&&(n.Wb(0,"button",43),n.Jc(1),n.Vb()),2&e){const e=t.$implicit;n.Cb(1),n.Kc(e.city)}}function y(e,t){if(1&e&&(n.Jc(0),n.Wb(1,"mat-icon",44),n.Jc(2,"info"),n.Vb()),2&e){const e=t.$implicit;n.Lc(" ",e.header," "),n.Cb(1),n.nc("matTooltip",e.description)}}function W(e,t){if(1&e&&(n.Wb(0,"div"),n.Jc(1),n.jc(2,"currency"),n.Vb()),2&e){const e=t.$implicit,o=n.ic();n.Cb(1),n.Kc(n.kc(2,1,o.getTotalCost(e)))}}function S(e,t){1&e&&n.Rb(0,"input",45)}const J=function(e){return{city:e}},T=function(){return[]},R=function(e){return{cost:e}};let M=(()=>{class e{constructor(){this.list=a,this.isLoading=!1,this.columns=[{header:"Name",field:"name"},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"}],this.columnsSortable=[{header:"Name",field:"name",sortable:!0},{header:"Weight",field:"weight",sortable:!0},{header:"Gender",field:"gender",sortable:!0},{header:"Mobile",field:"mobile",sortable:!0},{header:"City",field:"city",sortable:!0}],this.columnsExpandable=[{header:"Name",field:"name",showExpand:!0},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"}],this.columnsPinnable=[{header:"Position",field:"position",width:"200px"},{header:"Name",field:"name",width:"200px",pinned:"left"},{header:"tags",field:"tag.0.value",width:"200px"},{header:"Weight",field:"weight",width:"200px",pinned:"left"},{header:"Symbol",field:"symbol",width:"200px"},{header:"Gender",field:"gender",width:"200px"},{header:"Mobile",field:"mobile",width:"200px"},{header:"Tele",field:"tele",width:"200px"},{header:"City",field:"city",width:"200px"},{header:"Address",field:"address",width:"200px"},{header:"Date",field:"date",width:"200px"},{header:"Website",field:"website",width:"200px"},{header:"Company",field:"company",width:"200px"},{header:"Email",field:"email",width:"200px",pinned:"right"},{header:"Status",field:"status",type:"boolean",width:"200px"}],this.columnsWithButtons=[{header:"Name",field:"name"},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"},{header:"Option",field:"option",width:"120px",pinned:"right",right:"0px",type:"button",buttons:[{type:"icon",text:"edit",icon:"edit",tooltip:"Edit",click:()=>{alert("edit")}},{type:"icon",text:"delete",icon:"delete",tooltip:"Delete",color:"warn",pop:!0,popTitle:"Confirm delete?",click:()=>{alert("delete")}}]}],this.columnsWithFormatting=[{header:"Name",field:"name",formatter:e=>`<span class="label">${e.name}</span>`},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"}],this.columnsWithCustomCell=[],this.columnsWithCustomHeader=[{header:"Name",field:"name",description:"Info about the name"},{header:"Weight",field:"weight",description:"Info about the weight"},{header:"Gender",field:"gender",description:"Info about the gender"},{header:"Mobile",field:"mobile",description:"Info about the mobile"},{header:"City",field:"city",description:"Info about the city"}],this.columnsWithCustomFooter=[{header:"Name",field:"name",summary:"Total"},{header:"Weight",field:"weight",summary:e=>Math.max(...e)},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"},{header:"Cost",field:"cost",type:"currency"}],this.multiSelectable=!0,this.rowSelectable=!0,this.rowSelected=a.slice(1,2),this.hideRowSelectionCheckbox=!1,this.columnHideable=!0,this.columnMovable=!0,this.rowHover=!0,this.rowStriped=!1,this.cellTemplateString='[cellTemplate]="{city: cityTpl}"'}ngOnInit(){this.columnsWithCustomCell=[{header:"Name",field:"name"},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"},{header:"Status",field:"status",cellTemplate:this.statusTpl}]}trackByName(e,t){return t.name}log(e){console.log(e)}getTotalCost(e){return e.reduce((e,t)=>e+t,0)}}return e.\u0275fac=function(t){return new(t||e)},e.\u0275cmp=n.Kb({type:e,selectors:[["app-data-grid-demo"]],viewQuery:function(e,t){var o;1&e&&n.Ec(f,!0),2&e&&n.uc(o=n.fc())&&(t.statusTpl=o.first)},decls:113,vars:73,consts:[["mat-raised-button","","color","primary","href","https://github.com/ng-matero/extensions/blob/master/projects/demos/src/app/data-grid/data-grid-demo.component.html","target","_blank"],["mat-raised-button","","color","accent","href","https://nzbin.gitbook.io/material-extensions/data-grid","target","_blank"],["text","Basic"],[3,"data","columns","trackBy"],["text","Loading Status"],[3,"data","columns","loading"],["text","Hide Pagination"],[3,"data","columns","pageOnFront","showPaginator"],["text","Sortable"],[3,"data","columns","sortOnFront","sortChange"],["text","Row Selectable"],[3,"ngModel","ngModelChange"],[1,"mx-3",3,"ngModel","ngModelChange"],[3,"value"],[1,"mx-3",3,"value"],[3,"data","columns","multiSelectable","hideRowSelectionCheckbox","rowSelectable","rowSelected","rowSelectionChange","cellSelectionChange"],["text","Expandable Row"],[3,"data","columns","expandable","expansionTemplate"],["expansionTpl",""],["text","Column Hiding & Moving"],[1,"mb-3"],[3,"data","columns","showToolbar","toolbarTitle","columnHideable","columnMovable"],["text","Column Pinnable"],[3,"data","columns"],["text","Hover & Striped effect"],[3,"data","columns","rowHover","rowStriped"],["text","Row with option buttons"],["text","Custom cell template"],["statusTpl",""],[3,"data","columns","cellTemplate"],["cityTpl",""],["text","Data Formatting"],["text","No Result"],["text","Custom Header Template"],[3,"data","columns","headerTemplate"],["headerTpl",""],["text","Custom Footer Template"],[3,"data","columns","showSummary","summaryTemplate"],["footerTpl",""],["text","Custom Toolbar Template"],[3,"data","columns","showToolbar","showColumnMenuButton","toolbarTemplate"],["toolbarTpl",""],[3,"checked"],["mat-raised-button","","color","primary"],[3,"matTooltip"],["placeholder","Search"]],template:function(e,t){if(1&e&&(n.Wb(0,"p"),n.Jc(1," The "),n.Wb(2,"code"),n.Jc(3,"mtx-grid"),n.Vb(),n.Jc(4," is an powerful material table component. It supports cell selectable, row selectable, multiple row selectable, row expandable, column hiding, column moving and so on. "),n.Wb(5,"a",0),n.Jc(6,"View Code"),n.Vb(),n.Wb(7,"a",1),n.Jc(8,"API"),n.Vb(),n.Vb(),n.Rb(9,"docs-heading",2),n.Rb(10,"mtx-grid",3),n.Rb(11,"docs-heading",4),n.Rb(12,"mtx-grid",5),n.Rb(13,"docs-heading",6),n.Wb(14,"p"),n.Jc(15,"If you hide the pagination, you should set "),n.Wb(16,"code"),n.Jc(17,"pageOnFront"),n.Vb(),n.Jc(18," false to show all the data.\n"),n.Vb(),n.Rb(19,"mtx-grid",7),n.Rb(20,"docs-heading",8),n.Wb(21,"mtx-grid",9),n.ec("sortChange",(function(e){return t.log(e)})),n.Vb(),n.Rb(22,"docs-heading",10),n.Wb(23,"mat-checkbox",11),n.ec("ngModelChange",(function(e){return t.rowSelectable=e})),n.Jc(24,"Row selectable"),n.Vb(),n.Wb(25,"mat-checkbox",12),n.ec("ngModelChange",(function(e){return t.hideRowSelectionCheckbox=e})),n.Jc(26,"Hide checkbox"),n.Vb(),n.Wb(27,"mat-radio-group",11),n.ec("ngModelChange",(function(e){return t.multiSelectable=e})),n.Wb(28,"mat-radio-button",13),n.Jc(29,"Single"),n.Vb(),n.Wb(30,"mat-radio-button",14),n.Jc(31,"Multiple"),n.Vb(),n.Vb(),n.Wb(32,"p"),n.Jc(33,"If you choose multiple option, you can press "),n.Wb(34,"kbd"),n.Jc(35,"ctrl"),n.Vb(),n.Jc(36,"/"),n.Wb(37,"kbd"),n.Jc(38,"command"),n.Vb(),n.Jc(39," + click or select checkboxs to choose multiple row."),n.Vb(),n.Wb(40,"mtx-grid",15),n.ec("rowSelectionChange",(function(e){return t.log(e)}))("cellSelectionChange",(function(e){return t.log(e)})),n.Vb(),n.Rb(41,"docs-heading",16),n.Rb(42,"mtx-grid",17),n.Hc(43,w,1,1,"ng-template",null,18,n.Ic),n.Rb(45,"docs-heading",19),n.Wb(46,"div",20),n.Wb(47,"mat-checkbox",11),n.ec("ngModelChange",(function(e){return t.columnHideable=e})),n.Jc(48,"Column Hiding"),n.Vb(),n.Wb(49,"mat-checkbox",12),n.ec("ngModelChange",(function(e){return t.columnMovable=e})),n.Jc(50,"Column Moving"),n.Vb(),n.Vb(),n.Wb(51,"p"),n.Jc(52,"Click the "),n.Wb(53,"kbd"),n.Jc(54,"Column Shown"),n.Vb(),n.Jc(55," button, you can select or drag the columns."),n.Vb(),n.Rb(56,"mtx-grid",21),n.Rb(57,"docs-heading",22),n.Wb(58,"p"),n.Jc(59,"The "),n.Wb(60,"code"),n.Jc(61,"name"),n.Vb(),n.Jc(62," and "),n.Wb(63,"code"),n.Jc(64,"weight"),n.Vb(),n.Jc(65," column pinned left, the "),n.Wb(66,"code"),n.Jc(67,"email"),n.Vb(),n.Jc(68," column pinned right. Scroll the columns to test."),n.Vb(),n.Rb(69,"mtx-grid",23),n.Rb(70,"docs-heading",24),n.Wb(71,"div",20),n.Wb(72,"mat-checkbox",11),n.ec("ngModelChange",(function(e){return t.rowHover=e})),n.Jc(73,"Hover"),n.Vb(),n.Wb(74,"mat-checkbox",12),n.ec("ngModelChange",(function(e){return t.rowStriped=e})),n.Jc(75,"Striped"),n.Vb(),n.Vb(),n.Rb(76,"mtx-grid",25),n.Rb(77,"docs-heading",26),n.Rb(78,"mtx-grid",23),n.Rb(79,"docs-heading",27),n.Wb(80,"p"),n.Jc(81,"The status column are custom cells."),n.Vb(),n.Rb(82,"mtx-grid",23),n.Hc(83,C,2,1,"ng-template",null,28,n.Ic),n.Wb(85,"p"),n.Jc(86,"There has another easiest way to custom cells. You can use property "),n.Wb(87,"code"),n.Jc(88),n.Vb(),n.Vb(),n.Rb(89,"mtx-grid",29),n.Hc(90,x,2,1,"ng-template",null,30,n.Ic),n.Rb(92,"docs-heading",31),n.Wb(93,"p"),n.Jc(94,"The "),n.Wb(95,"code"),n.Jc(96,"name"),n.Vb(),n.Jc(97," field use a formatter."),n.Vb(),n.Rb(98,"mtx-grid",23),n.Rb(99,"docs-heading",32),n.Rb(100,"mtx-grid",23),n.Rb(101,"docs-heading",33),n.Rb(102,"mtx-grid",34),n.Hc(103,y,3,2,"ng-template",null,35,n.Ic),n.Rb(105,"docs-heading",36),n.Rb(106,"mtx-grid",37),n.Hc(107,W,3,3,"ng-template",null,38,n.Ic),n.Rb(109,"docs-heading",39),n.Rb(110,"mtx-grid",40),n.Hc(111,S,1,0,"ng-template",null,41,n.Ic)),2&e){const e=n.vc(44),o=n.vc(91),i=n.vc(104),l=n.vc(108),a=n.vc(112);n.Cb(10),n.nc("data",t.list)("columns",t.columns)("trackBy",t.trackByName),n.Cb(2),n.nc("data",t.list)("columns",t.columns)("loading",!0),n.Cb(7),n.nc("data",t.list)("columns",t.columns)("pageOnFront",!1)("showPaginator",!1),n.Cb(2),n.nc("data",t.list)("columns",t.columnsSortable)("sortOnFront",!0),n.Cb(2),n.nc("ngModel",t.rowSelectable),n.Cb(2),n.nc("ngModel",t.hideRowSelectionCheckbox),n.Cb(2),n.nc("ngModel",t.multiSelectable),n.Cb(1),n.nc("value",!1),n.Cb(2),n.nc("value",!0),n.Cb(10),n.nc("data",t.list)("columns",t.columns)("multiSelectable",t.multiSelectable)("hideRowSelectionCheckbox",t.hideRowSelectionCheckbox)("rowSelectable",t.rowSelectable)("rowSelected",t.rowSelected),n.Cb(2),n.nc("data",t.list)("columns",t.columnsExpandable)("expandable",!0)("expansionTemplate",e),n.Cb(5),n.nc("ngModel",t.columnHideable),n.Cb(2),n.nc("ngModel",t.columnMovable),n.Cb(7),n.nc("data",t.list)("columns",t.columns)("showToolbar",!0)("toolbarTitle","Data Grid")("columnHideable",t.columnHideable)("columnMovable",t.columnMovable),n.Cb(13),n.nc("data",t.list)("columns",t.columnsPinnable),n.Cb(3),n.nc("ngModel",t.rowHover),n.Cb(2),n.nc("ngModel",t.rowStriped),n.Cb(2),n.nc("data",t.list)("columns",t.columns)("rowHover",t.rowHover)("rowStriped",t.rowStriped),n.Cb(2),n.nc("data",t.list)("columns",t.columnsWithButtons),n.Cb(4),n.nc("data",t.list)("columns",t.columnsWithCustomCell),n.Cb(6),n.Kc(t.cellTemplateString),n.Cb(1),n.nc("data",t.list)("columns",t.columns)("cellTemplate",n.qc(68,J,o)),n.Cb(9),n.nc("data",t.list)("columns",t.columnsWithFormatting),n.Cb(2),n.nc("data",n.pc(70,T))("columns",t.columnsWithFormatting),n.Cb(2),n.nc("data",t.list)("columns",t.columnsWithCustomHeader)("headerTemplate",i),n.Cb(4),n.nc("data",t.list)("columns",t.columnsWithCustomFooter)("showSummary",!0)("summaryTemplate",n.qc(71,R,l)),n.Cb(4),n.nc("data",t.list)("columns",t.columns)("showToolbar",!0)("showColumnMenuButton",!1)("toolbarTemplate",a)}},directives:[c.a,s,m.a,b.a,h.m,h.p,u.b,u.a,p.a,c.b,r.a,g.a],pipes:[d.d],styles:["[_nghost-%COMP%]     .label{padding:5px 10px;border-radius:999px;background-color:#ffb74d}"]}),e})(),v=(()=>{class e{}return e.\u0275mod=n.Ob({type:e}),e.\u0275inj=n.Nb({factory:function(t){return new(t||e)},imports:[[l.a,i.h.forChild([{path:"",component:M}])]]}),e})()}}]);