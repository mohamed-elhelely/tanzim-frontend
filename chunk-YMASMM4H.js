import{a as we,b as _e}from"./chunk-NGXQPXF2.js";import{b as ye,c as ge,f as x}from"./chunk-J6TUP3BM.js";import{a as fe}from"./chunk-UEMDUWVQ.js";import{Ea as ve,S as N,ba as ce,ca as M,l as B,m as pe,na as de,pa as me,qa as ue,ra as C,ua as he,v as z,va as be}from"./chunk-I3MGTG4L.js";import{Bb as s,Cb as Y,Db as U,Eb as W,Fb as J,Ga as p,Gb as d,Hb as m,K as V,Kc as oe,L as $,N as P,Nb as X,Nc as ae,Ob as O,P as L,Pb as ee,Pc as se,Qb as ie,Tc as le,Ua as F,V as w,Va as j,W as _,X as R,Ya as Q,Za as Z,_a as c,_b as te,aa as T,eb as b,ha as E,hb as I,ib as D,lc as ne,nb as o,ob as f,oc as g,pb as v,qb as q,sc as k,ub as G,vb as H,wb as y,xb as S,xc as u,yc as re,zb as A}from"./chunk-WHBLO76T.js";import{a as K}from"./chunk-YEWEO3AL.js";var ke=`
    .p-drawer {
        display: flex;
        flex-direction: column;
        transform: translate3d(0px, 0px, 0px);
        position: relative;
        transition: transform 0.3s;
        background: dt('drawer.background');
        color: dt('drawer.color');
        border-style: solid;
        border-color: dt('drawer.border.color');
        box-shadow: dt('drawer.shadow');
    }

    .p-drawer-content {
        overflow-y: auto;
        flex-grow: 1;
        padding: dt('drawer.content.padding');
    }

    .p-drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        padding: dt('drawer.header.padding');
    }

    .p-drawer-footer {
        padding: dt('drawer.footer.padding');
    }

    .p-drawer-title {
        font-weight: dt('drawer.title.font.weight');
        font-size: dt('drawer.title.font.size');
    }

    .p-drawer-full .p-drawer {
        transition: none;
        transform: none;
        width: 100vw !important;
        height: 100vh !important;
        max-height: 100%;
        top: 0px !important;
        left: 0px !important;
        border-width: 1px;
    }

    .p-drawer-left .p-drawer-enter-active {
        animation: p-animate-drawer-enter-left 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-left .p-drawer-leave-active {
        animation: p-animate-drawer-leave-left 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .p-drawer-right .p-drawer-enter-active {
        animation: p-animate-drawer-enter-right 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-right .p-drawer-leave-active {
        animation: p-animate-drawer-leave-right 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .p-drawer-top .p-drawer-enter-active {
        animation: p-animate-drawer-enter-top 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-top .p-drawer-leave-active {
        animation: p-animate-drawer-leave-top 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .p-drawer-bottom .p-drawer-enter-active {
        animation: p-animate-drawer-enter-bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-bottom .p-drawer-leave-active {
        animation: p-animate-drawer-leave-bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .p-drawer-full .p-drawer-enter-active {
        animation: p-animate-drawer-enter-full 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .p-drawer-full .p-drawer-leave-active {
        animation: p-animate-drawer-leave-full 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    
    .p-drawer-left .p-drawer {
        width: 20rem;
        height: 100%;
        border-inline-end-width: 1px;
    }

    .p-drawer-right .p-drawer {
        width: 20rem;
        height: 100%;
        border-inline-start-width: 1px;
    }

    .p-drawer-top .p-drawer {
        height: 10rem;
        width: 100%;
        border-block-end-width: 1px;
    }

    .p-drawer-bottom .p-drawer {
        height: 10rem;
        width: 100%;
        border-block-start-width: 1px;
    }

    .p-drawer-left .p-drawer-content,
    .p-drawer-right .p-drawer-content,
    .p-drawer-top .p-drawer-content,
    .p-drawer-bottom .p-drawer-content {
        width: 100%;
        height: 100%;
    }

    .p-drawer-open {
        display: flex;
    }

    .p-drawer-mask:dir(rtl) {
        flex-direction: row-reverse;
    }

    @keyframes p-animate-drawer-enter-left {
        from {
            transform: translate3d(-100%, 0px, 0px);
        }
    }

    @keyframes p-animate-drawer-leave-left {
        to {
            transform: translate3d(-100%, 0px, 0px);
        }
    }

    @keyframes p-animate-drawer-enter-right {
        from {
            transform: translate3d(100%, 0px, 0px);
        }
    }

    @keyframes p-animate-drawer-leave-right {
        to {
            transform: translate3d(100%, 0px, 0px);
        }
    }

    @keyframes p-animate-drawer-enter-top {
        from {
            transform: translate3d(0px, -100%, 0px);
        }
    }

    @keyframes p-animate-drawer-leave-top {
        to {
            transform: translate3d(0px, -100%, 0px);
        }
    }

    @keyframes p-animate-drawer-enter-bottom {
        from {
            transform: translate3d(0px, 100%, 0px);
        }
    }

    @keyframes p-animate-drawer-leave-bottom {
        to {
            transform: translate3d(0px, 100%, 0px);
        }
    }

    @keyframes p-animate-drawer-enter-full {
        from {
            opacity: 0;
            transform: scale(0.93);
        }
    }

    @keyframes p-animate-drawer-leave-full {
        to {
            opacity: 0;
            transform: scale(0.93);
        }
    }
`;var Le=["header"],Te=["footer"],Me=["content"],Ke=["closeicon"],Ee=["headless"],Ie=["container"],De=["closeButton"],Se=["*"];function Ae(i,a){i&1&&y(0)}function Oe(i,a){if(i&1&&c(0,Ae,1,0,"ng-container",4),i&2){let e=s(2);o("ngTemplateOutlet",e.headlessTemplate||e._headlessTemplate)}}function Be(i,a){i&1&&y(0)}function ze(i,a){if(i&1&&(f(0,"div",9),ee(1),v()),i&2){let e=s(3);O(e.cx("title")),o("pBind",e.ptm("title")),p(),ie(e.header)}}function Ne(i,a){i&1&&(R(),q(0,"svg",12)),i&2&&b("data-pc-section","closeicon")}function Ve(i,a){}function $e(i,a){i&1&&c(0,Ve,0,0,"ng-template")}function Pe(i,a){if(i&1&&c(0,Ne,1,1,"svg",11)(1,$e,1,0,null,4),i&2){let e=s(4);o("ngIf",!e.closeIconTemplate&&!e._closeIconTemplate),p(),o("ngTemplateOutlet",e.closeIconTemplate||e._closeIconTemplate)}}function Re(i,a){if(i&1){let e=S();f(0,"p-button",10),A("onClick",function(t){w(e);let r=s(3);return _(r.close(t))})("keydown.enter",function(t){w(e);let r=s(3);return _(r.close(t))}),c(1,Pe,2,2,"ng-template",null,1,ne),v()}if(i&2){let e=s(3);o("pt",e.ptm("pcCloseButton"))("ngClass",e.cx("pcCloseButton"))("buttonProps",e.closeButtonProps)("ariaLabel",e.ariaCloseLabel)("unstyled",e.unstyled()),b("data-pc-group-section","iconcontainer")}}function Fe(i,a){i&1&&y(0)}function je(i,a){i&1&&y(0)}function Qe(i,a){if(i&1&&(G(0),f(1,"div",5),c(2,je,1,0,"ng-container",4),v(),H()),i&2){let e=s(3);p(),o("pBind",e.ptm("footer"))("ngClass",e.cx("footer")),b("data-pc-section","footer"),p(),o("ngTemplateOutlet",e.footerTemplate||e._footerTemplate)}}function Ze(i,a){if(i&1&&(f(0,"div",5),c(1,Be,1,0,"ng-container",4)(2,ze,2,4,"div",6)(3,Re,3,6,"p-button",7),v(),f(4,"div",5),U(5),c(6,Fe,1,0,"ng-container",4),v(),c(7,Qe,3,4,"ng-container",8)),i&2){let e=s(2);o("pBind",e.ptm("header"))("ngClass",e.cx("header")),b("data-pc-section","header"),p(),o("ngTemplateOutlet",e.headerTemplate||e._headerTemplate),p(),o("ngIf",e.header),p(),o("ngIf",e.showCloseIcon&&e.closable),p(),o("pBind",e.ptm("content"))("ngClass",e.cx("content")),b("data-pc-section","content"),p(2),o("ngTemplateOutlet",e.contentTemplate||e._contentTemplate),p(),o("ngIf",e.footerTemplate||e._footerTemplate)}}function qe(i,a){if(i&1){let e=S();f(0,"div",3,0),A("pMotionOnBeforeEnter",function(t){w(e);let r=s();return _(r.onBeforeEnter(t))})("pMotionOnAfterLeave",function(t){w(e);let r=s();return _(r.onAfterLeave(t))})("keydown",function(t){w(e);let r=s();return _(r.onKeyDown(t))}),I(2,Oe,1,1,"ng-container")(3,Ze,8,11),v()}if(i&2){let e=s();X(e.style),O(e.cn(e.cx("root"),e.styleClass)),o("pBind",e.ptm("root"))("pMotion",e.visible)("pMotionAppear",!0)("pMotionEnterActiveClass",e.$enterAnimation())("pMotionLeaveActiveClass",e.$leaveAnimation())("pMotionOptions",e.computedMotionOptions()),b("data-p",e.dataP)("data-p-open",e.visible),p(2),D(e.headlessTemplate||e._headlessTemplate?2:3)}}var Ge=`
${ke}

/** For PrimeNG **/
.p-drawer {
    position: fixed;
}

.p-drawer-left {
    top: 0;
    left: 0;
    width: 20rem;
    height: 100%;
    border-inline-end-width: 1px;
}

.p-drawer-right {
    top: 0;
    right: 0;
    width: 20rem;
    height: 100%;
    border-inline-start-width: 1px;
}

.p-drawer-top {
    top: 0;
    left: 0;
    width: 100%;
    height: 10rem;
    border-block-end-width: 1px;
}

.p-drawer-bottom {
    bottom: 0;
    left: 0;
    width: 100%;
    height: 10rem;
    border-block-start-width: 1px;
}

.p-drawer-full {
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    -webkit-transition: none;
    transition: none;
}

/* Animations */
.p-drawer-enter-left {
    animation: p-animate-drawer-enter-left 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-leave-left {
    animation: p-animate-drawer-leave-left 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-enter-right {
    animation: p-animate-drawer-enter-right 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-leave-right {
    animation: p-animate-drawer-leave-right 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-enter-top {
    animation: p-animate-drawer-enter-top 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-leave-top {
    animation: p-animate-drawer-leave-top 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-enter-bottom {
    animation: p-animate-drawer-enter-bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-leave-bottom {
    animation: p-animate-drawer-leave-bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-enter-full {
    animation: p-animate-drawer-enter-full 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.p-drawer-leave-full {
    animation: p-animate-drawer-leave-full 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
`,He={mask:({instance:i})=>["p-drawer-mask",{"p-overlay-mask p-overlay-mask-enter-active":i.modal},{"p-drawer-full":i.fullScreen()}],root:({instance:i})=>["p-drawer p-component",{"p-drawer-full":i.fullScreen(),"p-drawer-open":i.visible},`p-drawer-${i.position()}`],header:"p-drawer-header",title:"p-drawer-title",pcCloseButton:"p-drawer-close-button",content:"p-drawer-content",footer:"p-drawer-footer"},Ce=(()=>{class i extends de{name="drawer";style=Ge;classes=He;static \u0275fac=(()=>{let e;return function(t){return(e||(e=E(i)))(t||i)}})();static \u0275prov=V({token:i,factory:i.\u0275fac})}return i})();var xe=new P("DRAWER_INSTANCE"),Ye=(()=>{class i extends ue{componentName="Drawer";$pcDrawer=L(xe,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=L(C,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptm("host"))}appendTo=k(void 0);motionOptions=k(void 0);computedMotionOptions=g(()=>K(K({},this.ptm("motion")),this.motionOptions()));blockScroll=!1;style;styleClass;ariaCloseLabel;autoZIndex=!0;baseZIndex=0;modal=!0;closeButtonProps={severity:"secondary",text:!0,rounded:!0};dismissible=!0;showCloseIcon=!0;closeOnEscape=!0;transitionOptions="150ms cubic-bezier(0, 0, 0.2, 1)";get visible(){return this._visible??!1}set visible(e){this._visible=e,this._visible&&!this.modalVisible&&(this.modalVisible=!0)}position=k("left");fullScreen=k(!1);$enterAnimation=g(()=>this.fullScreen()?"p-drawer-enter-full":`p-drawer-enter-${this.position()}`);$leaveAnimation=g(()=>this.fullScreen()?"p-drawer-leave-full":`p-drawer-leave-${this.position()}`);header;maskStyle;closable=!0;onShow=new T;onHide=new T;visibleChange=new T;containerViewChild;closeButtonViewChild;initialized;_visible;_position="left";_fullScreen=!1;modalVisible=!1;container;mask;maskClickListener;documentEscapeListener;animationEndListener;_componentStyle=L(Ce);onAfterViewInit(){this.initialized=!0}headerTemplate;footerTemplate;contentTemplate;closeIconTemplate;headlessTemplate;$appendTo=g(()=>this.appendTo()||this.config.overlayAppendTo());_headerTemplate;_footerTemplate;_contentTemplate;_closeIconTemplate;_headlessTemplate;templates;onAfterContentInit(){this.templates?.forEach(e=>{switch(e.getType()){case"content":this._contentTemplate=e.template;break;case"header":this._headerTemplate=e.template;break;case"footer":this._footerTemplate=e.template;break;case"closeicon":this._closeIconTemplate=e.template;break;case"headless":this._headlessTemplate=e.template;break;default:this._contentTemplate=e.template;break}})}onKeyDown(e){e.code==="Escape"&&this.hide(!1)}show(){this.container?.setAttribute(this.$attrSelector,""),this.autoZIndex&&x.set("modal",this.container,this.baseZIndex||this.config.zIndex.modal),this.modal&&this.enableModality(),this.onShow.emit({}),this.visibleChange.emit(!0)}hide(e=!0){e&&this.onHide.emit({}),this.modal&&this.disableModality()}close(e){this.hide(),this.visibleChange.emit(!1),this.cd.markForCheck(),e.preventDefault()}enableModality(){let e=this.document.querySelectorAll('[data-p-open="true"]'),n=e.length,t=n==1?String(parseInt(this.container.style.zIndex)-1):String(parseInt(e[n-1].style.zIndex)-1);if(!this.mask){if(this.mask=this.renderer.createElement("div"),this.mask){let r=`z-index: ${t};${this.getMaskStyle()}`;N(this.mask,"style",r),N(this.mask,"data-p",this.dataP),B(this.mask,this.cx("mask"))}this.dismissible&&(this.maskClickListener=this.renderer.listen(this.mask,"click",r=>{this.dismissible&&this.close(r)})),this.renderer.appendChild(this.document.body,this.mask),this.blockScroll&&he()}}getMaskStyle(){return this.maskStyle?Object.entries(this.maskStyle).map(([e,n])=>`${e}: ${n}`).join("; "):""}disableModality(){this.mask&&(!this.$unstyled()&&pe(this.mask,"p-overlay-mask-enter-active"),!this.$unstyled()&&B(this.mask,"p-overlay-mask-leave-active"),this.animationEndListener=this.renderer.listen(this.mask,"animationend",this.destroyModal.bind(this)))}destroyModal(){this.unbindMaskClickListener(),this.mask&&this.renderer.removeChild(this.document.body,this.mask),this.blockScroll&&be(),this.unbindAnimationEndListener(),this.mask=null}onBeforeEnter(e){this.container=e.element,this.appendContainer(),this.show(),this.closeOnEscape&&this.bindDocumentEscapeListener()}onAfterLeave(){this.hide(!1),x.clear(this.container),this.unbindGlobalListeners(),this.modalVisible=!1,this.container=null}appendContainer(){this.$appendTo()&&this.$appendTo()!=="self"&&(this.$appendTo()==="body"?z(this.document.body,this.container):z(this.$appendTo(),this.container))}bindDocumentEscapeListener(){let e=this.el?this.el.nativeElement.ownerDocument:this.document;this.documentEscapeListener=this.renderer.listen(e,"keydown",n=>{n.which==27&&parseInt(this.container?.style.zIndex)===x.get(this.container)&&this.close(n)})}unbindDocumentEscapeListener(){this.documentEscapeListener&&(this.documentEscapeListener(),this.documentEscapeListener=null)}unbindMaskClickListener(){this.maskClickListener&&(this.maskClickListener(),this.maskClickListener=null)}unbindGlobalListeners(){this.unbindMaskClickListener(),this.unbindDocumentEscapeListener()}unbindAnimationEndListener(){this.animationEndListener&&this.mask&&(this.animationEndListener(),this.animationEndListener=null)}onDestroy(){this.initialized=!1,this.visible&&this.modal&&this.destroyModal(),this.$appendTo()&&this.container&&this.renderer.appendChild(this.el.nativeElement,this.container),this.container&&this.autoZIndex&&x.clear(this.container),this.container=null,this.unbindGlobalListeners(),this.unbindAnimationEndListener()}get dataP(){return this.cn({"full-screen":this.position()==="full",[this.position()]:this.position(),open:this.visible,modal:this.modal})}static \u0275fac=(()=>{let e;return function(t){return(e||(e=E(i)))(t||i)}})();static \u0275cmp=F({type:i,selectors:[["p-drawer"]],contentQueries:function(n,t,r){if(n&1&&W(r,Le,4)(r,Te,4)(r,Me,4)(r,Ke,4)(r,Ee,4)(r,ce,4),n&2){let l;d(l=m())&&(t.headerTemplate=l.first),d(l=m())&&(t.footerTemplate=l.first),d(l=m())&&(t.contentTemplate=l.first),d(l=m())&&(t.closeIconTemplate=l.first),d(l=m())&&(t.headlessTemplate=l.first),d(l=m())&&(t.templates=l)}},viewQuery:function(n,t){if(n&1&&J(Ie,5)(De,5),n&2){let r;d(r=m())&&(t.containerViewChild=r.first),d(r=m())&&(t.closeButtonViewChild=r.first)}},inputs:{appendTo:[1,"appendTo"],motionOptions:[1,"motionOptions"],blockScroll:[2,"blockScroll","blockScroll",u],style:"style",styleClass:"styleClass",ariaCloseLabel:"ariaCloseLabel",autoZIndex:[2,"autoZIndex","autoZIndex",u],baseZIndex:[2,"baseZIndex","baseZIndex",re],modal:[2,"modal","modal",u],closeButtonProps:"closeButtonProps",dismissible:[2,"dismissible","dismissible",u],showCloseIcon:[2,"showCloseIcon","showCloseIcon",u],closeOnEscape:[2,"closeOnEscape","closeOnEscape",u],transitionOptions:"transitionOptions",visible:"visible",position:[1,"position"],fullScreen:[1,"fullScreen"],header:"header",maskStyle:"maskStyle",closable:[2,"closable","closable",u]},outputs:{onShow:"onShow",onHide:"onHide",visibleChange:"visibleChange"},features:[te([Ce,{provide:xe,useExisting:i},{provide:me,useExisting:i}]),Q([C]),Z],ngContentSelectors:Se,decls:1,vars:1,consts:[["container",""],["icon",""],["role","complementary","pFocusTrap","",3,"pBind","pMotion","pMotionAppear","pMotionEnterActiveClass","pMotionLeaveActiveClass","pMotionOptions","class","style"],["role","complementary","pFocusTrap","",3,"pMotionOnBeforeEnter","pMotionOnAfterLeave","keydown","pBind","pMotion","pMotionAppear","pMotionEnterActiveClass","pMotionLeaveActiveClass","pMotionOptions"],[4,"ngTemplateOutlet"],[3,"pBind","ngClass"],[3,"pBind","class",4,"ngIf"],[3,"pt","ngClass","buttonProps","ariaLabel","unstyled","onClick","keydown.enter",4,"ngIf"],[4,"ngIf"],[3,"pBind"],[3,"onClick","keydown.enter","pt","ngClass","buttonProps","ariaLabel","unstyled"],["data-p-icon","times",4,"ngIf"],["data-p-icon","times"]],template:function(n,t){n&1&&(Y(),I(0,qe,4,13,"div",2)),n&2&&D(t.modalVisible?0:-1)},dependencies:[le,oe,ae,se,ve,fe,M,C,_e,we,ge,ye],encapsulation:2,changeDetection:0})}return i})(),Ti=(()=>{class i{static \u0275fac=function(n){return new(n||i)};static \u0275mod=j({type:i});static \u0275inj=$({imports:[Ye,M,M]})}return i})();var h=["COMPANY","EMPLOYEE"],Ii=[{labelKey:"nav.dashboard",icon:"pi pi-home",routerLink:"/dashboard"},{labelKey:"nav.companies",icon:"pi pi-briefcase",routerLink:"/admin/companies",staffOnly:!0},{labelKey:"nav.platformBilling",icon:"pi pi-credit-card",routerLink:"/admin/billing",staffOnly:!0,children:[{labelKey:"nav.subscriptions",icon:"pi pi-id-card",routerLink:"/admin/billing/subscriptions"},{labelKey:"nav.plans",icon:"pi pi-tags",routerLink:"/admin/billing/plans"},{labelKey:"nav.billingModules",icon:"pi pi-th-large",routerLink:"/admin/billing/modules"},{labelKey:"nav.platformInvoices",icon:"pi pi-receipt",routerLink:"/admin/billing/invoices"},{labelKey:"nav.platformPayments",icon:"pi pi-wallet",routerLink:"/admin/billing/payments"},{labelKey:"nav.billingReports",icon:"pi pi-chart-bar",routerLink:"/admin/billing/reports"}]},{labelKey:"nav.systemLogs",icon:"pi pi-history",routerLink:"/admin/system-logs",staffOnly:!0},{labelKey:"nav.company",icon:"pi pi-building",routerLink:"/company",permission:"access_company",roles:h,children:[{labelKey:"nav.companyUsers",icon:"pi pi-users",routerLink:"/company/users",permission:"view_companyuser"},{labelKey:"nav.departments",icon:"pi pi-sitemap",routerLink:"/company/departments",permission:"view_department"},{labelKey:"nav.teams",icon:"pi pi-id-card",routerLink:"/company/teams",permission:"view_team"},{labelKey:"nav.roles",icon:"pi pi-shield",routerLink:"/company/roles",permission:"view_role"},{labelKey:"nav.permissionGroups",icon:"pi pi-th-large",routerLink:"/company/permission-groups",permission:"view_permissiongroup"},{labelKey:"nav.permissions",icon:"pi pi-key",routerLink:"/company/permissions",permission:"view_permission"},{labelKey:"nav.companyProfile",icon:"pi pi-palette",routerLink:"/company/profile",permission:"view_company"},{labelKey:"nav.systemLogs",icon:"pi pi-history",routerLink:"/company/system-logs",permission:"view_auditlog"}]},{labelKey:"nav.locations",icon:"pi pi-map-marker",routerLink:"/locations",permission:"access_location",module:"location",roles:h,children:[{labelKey:"nav.sites",icon:"pi pi-building",routerLink:"/locations/sites",permission:"view_location"},{labelKey:"nav.countries",icon:"pi pi-globe",routerLink:"/locations/countries",permission:"view_country"},{labelKey:"nav.regions",icon:"pi pi-map",routerLink:"/locations/regions",permission:"view_region"},{labelKey:"nav.cities",icon:"pi pi-compass",routerLink:"/locations/cities",permission:"view_city"},{labelKey:"nav.districts",icon:"pi pi-directions",routerLink:"/locations/districts",permission:"view_district"}]},{labelKey:"nav.inventory",icon:"pi pi-box",routerLink:"/inventory",permission:"access_inventory",module:"inventory",roles:h,children:[{labelKey:"nav.products",icon:"pi pi-box",routerLink:"/inventory/products",permission:"view_product"},{labelKey:"nav.variants",icon:"pi pi-clone",routerLink:"/inventory/variants",permission:"view_productvariant"},{labelKey:"nav.categories",icon:"pi pi-tags",routerLink:"/inventory/categories",permission:"view_category"},{labelKey:"nav.brands",icon:"pi pi-star",routerLink:"/inventory/brands",permission:"view_brand"},{labelKey:"nav.warehouses",icon:"pi pi-warehouse",routerLink:"/inventory/warehouses",permission:"view_warehouse"},{labelKey:"nav.zones",icon:"pi pi-objects-column",routerLink:"/inventory/zones",permission:"view_zone"},{labelKey:"nav.bins",icon:"pi pi-inbox",routerLink:"/inventory/bins",permission:"view_bin"},{labelKey:"nav.suppliers",icon:"pi pi-truck",routerLink:"/inventory/suppliers",permission:"view_supplier"},{labelKey:"nav.supplierProducts",icon:"pi pi-list",routerLink:"/inventory/supplier-products",permission:"view_supplierproduct"},{labelKey:"nav.stockLevels",icon:"pi pi-chart-bar",routerLink:"/inventory/stock",permission:"view_stockreservation"},{labelKey:"nav.stockLedger",icon:"pi pi-history",routerLink:"/inventory/stock-ledger",permission:"view_stockledger"}]},{labelKey:"nav.sales",icon:"pi pi-shopping-cart",routerLink:"/sales",permission:"access_sales",roles:h,children:[{labelKey:"nav.salesOrders",icon:"pi pi-file",routerLink:"/sales/orders",permission:"view_salesorder"},{labelKey:"nav.deliveries",icon:"pi pi-truck",routerLink:"/sales/deliveries",permission:"view_deliverynote"},{labelKey:"nav.salesInvoices",icon:"pi pi-receipt",routerLink:"/sales/invoices",permission:"view_salesinvoice"},{labelKey:"nav.payments",icon:"pi pi-wallet",routerLink:"/sales/payments",permission:"view_invoicepayment"},{labelKey:"nav.customers",icon:"pi pi-users",routerLink:"/sales/customers",permission:"view_customer"}]},{labelKey:"nav.returns",icon:"pi pi-replay",routerLink:"/returns",permission:"access_returns",roles:h,children:[{labelKey:"nav.customerReturns",icon:"pi pi-user",routerLink:"/returns/customer",permission:"view_customerreturn"},{labelKey:"nav.supplierReturns",icon:"pi pi-truck",routerLink:"/returns/supplier",permission:"view_supplierreturn"}]},{labelKey:"nav.analytics",icon:"pi pi-chart-line",routerLink:"/analytics",permission:"access_reports",module:"inventory",roles:h,children:[{labelKey:"nav.dashboards",icon:"pi pi-th-large",routerLink:"/analytics/dashboards",permission:"view_dashboard"},{labelKey:"nav.reports",icon:"pi pi-chart-bar",routerLink:"/analytics/reports",permission:"view_report"}]},{labelKey:"nav.accounting",icon:"pi pi-calculator",routerLink:"/accounting",permission:"access_accounting",module:"accounting",roles:h,children:[{labelKey:"nav.journalEntries",icon:"pi pi-book",routerLink:"/accounting/journal-entries",permission:"view_journalentry"},{labelKey:"nav.accounts",icon:"pi pi-sitemap",routerLink:"/accounting/accounts",permission:"view_account"},{labelKey:"nav.fiscalYears",icon:"pi pi-calendar",routerLink:"/accounting/fiscal-years",permission:"view_fiscalyear"},{labelKey:"nav.accountingReports",icon:"pi pi-chart-bar",routerLink:"/accounting/reports",permission:"view_accountingreport"},{labelKey:"nav.supplierPayments",icon:"pi pi-wallet",routerLink:"/accounting/supplier-payments",permission:"view_supplierpayment"},{labelKey:"nav.debitNotes",icon:"pi pi-minus-circle",routerLink:"/accounting/debit-notes",permission:"view_debitnote"}]},{labelKey:"nav.billing",icon:"pi pi-credit-card",routerLink:"/billing",roles:["COMPANY"]},{labelKey:"nav.notifications",icon:"pi pi-bell",routerLink:"/notifications"},{labelKey:"nav.importExport",icon:"pi pi-file-import",routerLink:"/import-export",roles:h}];export{Ye as a,Ti as b,Ii as c};
