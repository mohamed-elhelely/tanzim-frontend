import{a as xt,b as wt,c as Ct,d as vt,e as Lt,f as St,g as Tt}from"./chunk-5N4PD5V2.js";import{b as _t}from"./chunk-XZOSFDC2.js";import{a as yt}from"./chunk-G7KI7K3V.js";import{c as kt}from"./chunk-TC72TTVG.js";import{a as U,b as ft}from"./chunk-TRQLEOUK.js";import{b as it,c as nt}from"./chunk-LIVSENTL.js";import{a as dt}from"./chunk-LLLTHOTJ.js";import{a as rt,b as st,c as lt,f as pt}from"./chunk-WH6PCYWT.js";import{a as ut}from"./chunk-GUH2AZYS.js";import{a as ot,b as at}from"./chunk-DC5TJ27T.js";import{d as Ge,e as Xe,f as Ye,g as Je}from"./chunk-RDL3H57Y.js";import{a as Fe,b as Re}from"./chunk-HVU6QXIO.js";import{a as je}from"./chunk-HR7JUST2.js";import{a as Qe,c as ct}from"./chunk-QITN6JF7.js";import{b as Pe,c as $e,f as R}from"./chunk-DP7M3G2H.js";import{a as Ke}from"./chunk-ILFA632U.js";import{a as Ne}from"./chunk-UI3UNRU7.js";import{a as et,b as tt}from"./chunk-JFB6NOQ2.js";import{b as He,e as Ze,g as Ue,r as qe}from"./chunk-JPO4ZN2P.js";import{a as mt}from"./chunk-2ICXIGRM.js";import{b as gt}from"./chunk-YPEKISGI.js";import{Ea as Z,Fa as ze,S as ee,ba as Q,ca as H,l as Y,m as Me,na as Be,pa as De,qa as Ve,ra as F,ua as Ae,v as J,va as Oe}from"./chunk-J2ZWPT2H.js";import{a as bt}from"./chunk-O3LRIG6R.js";import{a as ht}from"./chunk-6LGUZDJE.js";import{f as We}from"./chunk-6NO5NRUY.js";import{c as ke,f as Ee,g as Ie}from"./chunk-WFF4I4DD.js";import{$ as o,$a as A,Aa as C,Ab as O,D as ie,E as ne,Ea as pe,F as oe,Fa as de,Fb as D,Ga as z,Gb as we,H as x,Ha as v,J as f,Ja as L,K as y,Kb as Ce,L as ae,La as m,Ma as me,Na as ce,Nb as ve,Oa as ue,P,Pa as _e,Pb as Le,Qa as k,Ra as E,Rb as Se,S as N,Tb as Te,V as G,Xa as fe,Ya as X,Za as c,_a as u,ab as ye,cb as I,db as M,ea as $,eb as B,fa as re,ia as se,ib as ge,ja as le,jb as he,ka as w,kb as be,oa as T,ra as g,rb as p,sa as h,sb as d,tb as j,va as W,vb as xe,wa as K,xa as _,xb as S,ya as r,za as s}from"./chunk-SW4KMQDG.js";import{a as V,b as q}from"./chunk-YEWEO3AL.js";var Et=`
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
`;var Nt=["header"],zt=["footer"],Ft=["content"],Rt=["closeicon"],Pt=["headless"],$t=["container"],Wt=["closeButton"],Kt=["*"];function jt(t,i){t&1&&z(0)}function Qt(t,i){if(t&1&&w(0,jt,1,0,"ng-container",4),t&2){let e=m(2);_("ngTemplateOutlet",e.headlessTemplate||e._headlessTemplate)}}function Ht(t,i){t&1&&z(0)}function Zt(t,i){if(t&1&&(r(0,"div",9),c(1),s()),t&2){let e=m(3);X(e.cx("title")),_("pBind",e.ptm("title")),o(),u(e.header)}}function Ut(t,i){t&1&&(ae(),C(0,"svg",12)),t&2&&T("data-pc-section","closeicon")}function qt(t,i){}function Gt(t,i){t&1&&w(0,qt,0,0,"ng-template")}function Xt(t,i){if(t&1&&w(0,Ut,1,1,"svg",11)(1,Gt,1,0,null,4),t&2){let e=m(4);_("ngIf",!e.closeIconTemplate&&!e._closeIconTemplate),o(),_("ngTemplateOutlet",e.closeIconTemplate||e._closeIconTemplate)}}function Yt(t,i){if(t&1){let e=v();r(0,"p-button",10),L("onClick",function(n){f(e);let l=m(3);return y(l.close(n))})("keydown.enter",function(n){f(e);let l=m(3);return y(l.close(n))}),w(1,Xt,2,2,"ng-template",null,1,xe),s()}if(t&2){let e=m(3);_("pt",e.ptm("pcCloseButton"))("ngClass",e.cx("pcCloseButton"))("buttonProps",e.closeButtonProps)("ariaLabel",e.ariaCloseLabel)("unstyled",e.unstyled()),T("data-pc-group-section","iconcontainer")}}function Jt(t,i){t&1&&z(0)}function ei(t,i){t&1&&z(0)}function ti(t,i){if(t&1&&(pe(0),r(1,"div",5),w(2,ei,1,0,"ng-container",4),s(),de()),t&2){let e=m(3);o(),_("pBind",e.ptm("footer"))("ngClass",e.cx("footer")),T("data-pc-section","footer"),o(),_("ngTemplateOutlet",e.footerTemplate||e._footerTemplate)}}function ii(t,i){if(t&1&&(r(0,"div",5),w(1,Ht,1,0,"ng-container",4)(2,Zt,2,4,"div",6)(3,Yt,3,6,"p-button",7),s(),r(4,"div",5),ce(5),w(6,Jt,1,0,"ng-container",4),s(),w(7,ti,3,4,"ng-container",8)),t&2){let e=m(2);_("pBind",e.ptm("header"))("ngClass",e.cx("header")),T("data-pc-section","header"),o(),_("ngTemplateOutlet",e.headerTemplate||e._headerTemplate),o(),_("ngIf",e.header),o(),_("ngIf",e.showCloseIcon&&e.closable),o(),_("pBind",e.ptm("content"))("ngClass",e.cx("content")),T("data-pc-section","content"),o(2),_("ngTemplateOutlet",e.contentTemplate||e._contentTemplate),o(),_("ngIf",e.footerTemplate||e._footerTemplate)}}function ni(t,i){if(t&1){let e=v();r(0,"div",3,0),L("pMotionOnBeforeEnter",function(n){f(e);let l=m();return y(l.onBeforeEnter(n))})("pMotionOnAfterLeave",function(n){f(e);let l=m();return y(l.onAfterLeave(n))})("keydown",function(n){f(e);let l=m();return y(l.onKeyDown(n))}),g(2,Qt,1,1,"ng-container")(3,ii,8,11),s()}if(t&2){let e=m();fe(e.style),X(e.cn(e.cx("root"),e.styleClass)),_("pBind",e.ptm("root"))("pMotion",e.visible)("pMotionAppear",!0)("pMotionEnterActiveClass",e.$enterAnimation())("pMotionLeaveActiveClass",e.$leaveAnimation())("pMotionOptions",e.computedMotionOptions()),T("data-p",e.dataP)("data-p-open",e.visible),o(2),h(e.headlessTemplate||e._headlessTemplate?2:3)}}var oi=`
${Et}

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
`,ai={mask:({instance:t})=>["p-drawer-mask",{"p-overlay-mask p-overlay-mask-enter-active":t.modal},{"p-drawer-full":t.fullScreen()}],root:({instance:t})=>["p-drawer p-component",{"p-drawer-full":t.fullScreen(),"p-drawer-open":t.visible},`p-drawer-${t.position()}`],header:"p-drawer-header",title:"p-drawer-title",pcCloseButton:"p-drawer-close-button",content:"p-drawer-content",footer:"p-drawer-footer"},It=(()=>{class t extends Be{name="drawer";style=oi;classes=ai;static \u0275fac=(()=>{let e;return function(n){return(e||(e=G(t)))(n||t)}})();static \u0275prov=ie({token:t,factory:t.\u0275fac})}return t})();var Mt=new oe("DRAWER_INSTANCE"),te=(()=>{class t extends Ve{componentName="Drawer";$pcDrawer=x(Mt,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=x(F,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptm("host"))}appendTo=O(void 0);motionOptions=O(void 0);computedMotionOptions=S(()=>V(V({},this.ptm("motion")),this.motionOptions()));blockScroll=!1;style;styleClass;ariaCloseLabel;autoZIndex=!0;baseZIndex=0;modal=!0;closeButtonProps={severity:"secondary",text:!0,rounded:!0};dismissible=!0;showCloseIcon=!0;closeOnEscape=!0;transitionOptions="150ms cubic-bezier(0, 0, 0.2, 1)";get visible(){return this._visible??!1}set visible(e){this._visible=e,this._visible&&!this.modalVisible&&(this.modalVisible=!0)}position=O("left");fullScreen=O(!1);$enterAnimation=S(()=>this.fullScreen()?"p-drawer-enter-full":`p-drawer-enter-${this.position()}`);$leaveAnimation=S(()=>this.fullScreen()?"p-drawer-leave-full":`p-drawer-leave-${this.position()}`);header;maskStyle;closable=!0;onShow=new P;onHide=new P;visibleChange=new P;containerViewChild;closeButtonViewChild;initialized;_visible;_position="left";_fullScreen=!1;modalVisible=!1;container;mask;maskClickListener;documentEscapeListener;animationEndListener;_componentStyle=x(It);onAfterViewInit(){this.initialized=!0}headerTemplate;footerTemplate;contentTemplate;closeIconTemplate;headlessTemplate;$appendTo=S(()=>this.appendTo()||this.config.overlayAppendTo());_headerTemplate;_footerTemplate;_contentTemplate;_closeIconTemplate;_headlessTemplate;templates;onAfterContentInit(){this.templates?.forEach(e=>{switch(e.getType()){case"content":this._contentTemplate=e.template;break;case"header":this._headerTemplate=e.template;break;case"footer":this._footerTemplate=e.template;break;case"closeicon":this._closeIconTemplate=e.template;break;case"headless":this._headlessTemplate=e.template;break;default:this._contentTemplate=e.template;break}})}onKeyDown(e){e.code==="Escape"&&this.hide(!1)}show(){this.container?.setAttribute(this.$attrSelector,""),this.autoZIndex&&R.set("modal",this.container,this.baseZIndex||this.config.zIndex.modal),this.modal&&this.enableModality(),this.onShow.emit({}),this.visibleChange.emit(!0)}hide(e=!0){e&&this.onHide.emit({}),this.modal&&this.disableModality()}close(e){this.hide(),this.visibleChange.emit(!1),this.cd.markForCheck(),e.preventDefault()}enableModality(){let e=this.document.querySelectorAll('[data-p-open="true"]'),a=e.length,n=a==1?String(parseInt(this.container.style.zIndex)-1):String(parseInt(e[a-1].style.zIndex)-1);if(!this.mask){if(this.mask=this.renderer.createElement("div"),this.mask){let l=`z-index: ${n};${this.getMaskStyle()}`;ee(this.mask,"style",l),ee(this.mask,"data-p",this.dataP),Y(this.mask,this.cx("mask"))}this.dismissible&&(this.maskClickListener=this.renderer.listen(this.mask,"click",l=>{this.dismissible&&this.close(l)})),this.renderer.appendChild(this.document.body,this.mask),this.blockScroll&&Ae()}}getMaskStyle(){return this.maskStyle?Object.entries(this.maskStyle).map(([e,a])=>`${e}: ${a}`).join("; "):""}disableModality(){this.mask&&(!this.$unstyled()&&Me(this.mask,"p-overlay-mask-enter-active"),!this.$unstyled()&&Y(this.mask,"p-overlay-mask-leave-active"),this.animationEndListener=this.renderer.listen(this.mask,"animationend",this.destroyModal.bind(this)))}destroyModal(){this.unbindMaskClickListener(),this.mask&&this.renderer.removeChild(this.document.body,this.mask),this.blockScroll&&Oe(),this.unbindAnimationEndListener(),this.mask=null}onBeforeEnter(e){this.container=e.element,this.appendContainer(),this.show(),this.closeOnEscape&&this.bindDocumentEscapeListener()}onAfterLeave(){this.hide(!1),R.clear(this.container),this.unbindGlobalListeners(),this.modalVisible=!1,this.container=null}appendContainer(){this.$appendTo()&&this.$appendTo()!=="self"&&(this.$appendTo()==="body"?J(this.document.body,this.container):J(this.$appendTo(),this.container))}bindDocumentEscapeListener(){let e=this.el?this.el.nativeElement.ownerDocument:this.document;this.documentEscapeListener=this.renderer.listen(e,"keydown",a=>{a.which==27&&parseInt(this.container?.style.zIndex)===R.get(this.container)&&this.close(a)})}unbindDocumentEscapeListener(){this.documentEscapeListener&&(this.documentEscapeListener(),this.documentEscapeListener=null)}unbindMaskClickListener(){this.maskClickListener&&(this.maskClickListener(),this.maskClickListener=null)}unbindGlobalListeners(){this.unbindMaskClickListener(),this.unbindDocumentEscapeListener()}unbindAnimationEndListener(){this.animationEndListener&&this.mask&&(this.animationEndListener(),this.animationEndListener=null)}onDestroy(){this.initialized=!1,this.visible&&this.modal&&this.destroyModal(),this.$appendTo()&&this.container&&this.renderer.appendChild(this.el.nativeElement,this.container),this.container&&this.autoZIndex&&R.clear(this.container),this.container=null,this.unbindGlobalListeners(),this.unbindAnimationEndListener()}get dataP(){return this.cn({"full-screen":this.position()==="full",[this.position()]:this.position(),open:this.visible,modal:this.modal})}static \u0275fac=(()=>{let e;return function(n){return(e||(e=G(t)))(n||t)}})();static \u0275cmp=$({type:t,selectors:[["p-drawer"]],contentQueries:function(a,n,l){if(a&1&&ue(l,Nt,4)(l,zt,4)(l,Ft,4)(l,Rt,4)(l,Pt,4)(l,Q,4),a&2){let b;k(b=E())&&(n.headerTemplate=b.first),k(b=E())&&(n.footerTemplate=b.first),k(b=E())&&(n.contentTemplate=b.first),k(b=E())&&(n.closeIconTemplate=b.first),k(b=E())&&(n.headlessTemplate=b.first),k(b=E())&&(n.templates=b)}},viewQuery:function(a,n){if(a&1&&_e($t,5)(Wt,5),a&2){let l;k(l=E())&&(n.containerViewChild=l.first),k(l=E())&&(n.closeButtonViewChild=l.first)}},inputs:{appendTo:[1,"appendTo"],motionOptions:[1,"motionOptions"],blockScroll:[2,"blockScroll","blockScroll",D],style:"style",styleClass:"styleClass",ariaCloseLabel:"ariaCloseLabel",autoZIndex:[2,"autoZIndex","autoZIndex",D],baseZIndex:[2,"baseZIndex","baseZIndex",we],modal:[2,"modal","modal",D],closeButtonProps:"closeButtonProps",dismissible:[2,"dismissible","dismissible",D],showCloseIcon:[2,"showCloseIcon","showCloseIcon",D],closeOnEscape:[2,"closeOnEscape","closeOnEscape",D],transitionOptions:"transitionOptions",visible:"visible",position:[1,"position"],fullScreen:[1,"fullScreen"],header:"header",maskStyle:"maskStyle",closable:[2,"closable","closable",D]},outputs:{onShow:"onShow",onHide:"onHide",visibleChange:"visibleChange"},features:[ge([It,{provide:Mt,useExisting:t},{provide:De,useExisting:t}]),se([F]),le],ngContentSelectors:Kt,decls:1,vars:1,consts:[["container",""],["icon",""],["role","complementary","pFocusTrap","",3,"pBind","pMotion","pMotionAppear","pMotionEnterActiveClass","pMotionLeaveActiveClass","pMotionOptions","class","style"],["role","complementary","pFocusTrap","",3,"pMotionOnBeforeEnter","pMotionOnAfterLeave","keydown","pBind","pMotion","pMotionAppear","pMotionEnterActiveClass","pMotionLeaveActiveClass","pMotionOptions"],[4,"ngTemplateOutlet"],[3,"pBind","ngClass"],[3,"pBind","class",4,"ngIf"],[3,"pt","ngClass","buttonProps","ariaLabel","unstyled","onClick","keydown.enter",4,"ngIf"],[4,"ngIf"],[3,"pBind"],[3,"onClick","keydown.enter","pt","ngClass","buttonProps","ariaLabel","unstyled"],["data-p-icon","times",4,"ngIf"],["data-p-icon","times"]],template:function(a,n){a&1&&(me(),g(0,ni,4,13,"div",2)),a&2&&h(n.modalVisible?0:-1)},dependencies:[Te,Ce,ve,Le,Z,Ne,H,F,Re,Fe,$e,Pe],encapsulation:2,changeDetection:0})}return t})(),Bt=(()=>{class t{static \u0275fac=function(a){return new(a||t)};static \u0275mod=re({type:t});static \u0275inj=ne({imports:[te,H,H]})}return t})();var si=()=>[10,25,50],li=t=>({count:t}),Vt=(t,i)=>i.field,pi=(t,i)=>i.labelKey;function di(t,i){if(t&1&&C(0,"app-page-header",0),t&2){let e=m();_("actions",e.headerActions())}}function mi(t,i){if(t&1){let e=v();r(0,"app-error-state",4),L("retry",function(){f(e);let n=m();return y(n.table.load())}),s()}if(t&2){let e=i,a=m();_("title",a.errorTitleKey(e))("showRetry",e.status!==403)}}function ci(t,i){if(t&1){let e=v();r(0,"p-select",24),p(1,"translate"),p(2,"translate"),B("ngModelChange",function(n){f(e);let l=m(2);return M(l.company,n)||(l.company=n),y(n)}),s()}if(t&2){let e=m(2);I("ngModel",e.company),_("options",e.companyOptions())("filter",!0)("showClear",!0)("placeholder",d(1,6,"systemLogs.fields.company"))("ariaLabel",d(2,8,"systemLogs.fields.company"))}}function ui(t,i){if(t&1){let e=v();r(0,"p-select",24),p(1,"translate"),p(2,"translate"),B("ngModelChange",function(n){f(e);let l=m(2);return M(l.user,n)||(l.user=n),y(n)}),s()}if(t&2){let e=m(2);I("ngModel",e.user),_("options",e.userOptions())("filter",!0)("showClear",!0)("placeholder",d(1,6,"systemLogs.fields.user"))("ariaLabel",d(2,8,"systemLogs.fields.user"))}}function _i(t,i){if(t&1){let e=v();r(0,"p-multiselect",25),p(1,"translate"),p(2,"translate"),p(3,"translate"),B("ngModelChange",function(n){f(e);let l=m(2);return M(l.resources,n)||(l.resources=n),y(n)}),s()}if(t&2){let e=m(2);I("ngModel",e.resources),_("options",e.resourceOptions())("filter",!0)("showClear",!0)("maxSelectedLabels",2)("selectedItemsLabel",d(1,8,"common.selectedCount"))("placeholder",d(2,10,"systemLogs.fields.resource"))("ariaLabel",d(3,12,"systemLogs.fields.resource"))}}function fi(t,i){if(t&1&&C(0,"app-saved-views",16),t&2){let e=m(2);_("table",e.table)}}function yi(t,i){if(t&1){let e=v();r(0,"p-button",26),p(1,"translate"),L("onClick",function(){f(e);let n=m(2);return y(n.table.clear())}),s()}t&2&&_("label",d(1,2,"common.clearFilters"))("text",!0)}function gi(t,i){t&1&&(r(0,"th"),c(1),p(2,"translate"),s()),t&2&&(o(),u(d(2,1,"systemLogs.fields.company")))}function hi(t,i){if(t&1&&(r(0,"tr")(1,"th",27),c(2),p(3,"translate"),C(4,"p-sortIcon",28),s(),g(5,gi,3,3,"th"),r(6,"th"),c(7),p(8,"translate"),s(),r(9,"th"),c(10),p(11,"translate"),s(),r(12,"th"),c(13),p(14,"translate"),s(),r(15,"th"),c(16),p(17,"translate"),s(),r(18,"th"),c(19),p(20,"translate"),s()()),t&2){let e=m(2);o(2),A(" ",d(3,7,"systemLogs.fields.time")," "),o(3),h(e.staff()?5:-1),o(2),u(d(8,9,"systemLogs.fields.user")),o(3),u(d(11,11,"systemLogs.fields.action")),o(3),u(d(14,13,"systemLogs.fields.resource")),o(3),u(d(17,15,"systemLogs.fields.record")),o(3),u(d(20,17,"systemLogs.fields.changes"))}}function bi(t,i){if(t&1&&(r(0,"td",31),c(1),s()),t&2){let e=m().$implicit,a=m(2);o(),u(a.companyLabel(e.company))}}function xi(t,i){if(t&1&&(r(0,"span",35),c(1),s(),c(2)),t&2){let e=i.$implicit,a=i.$index,n=i.$count;o(),u(e.field),o(),A("",a===n-1?"":", "," ")}}function wi(t,i){if(t&1&&(c(0),p(1,"translate")),t&2){let e=m(2).$implicit;A(" ",j(1,1,"systemLogs.meta.countValue",be(4,li,e.meta.count))," ")}}function Ci(t,i){t&1&&c(0," \u2014 ")}function vi(t,i){if(t&1&&g(0,wi,2,6)(1,Ci,1,0),t&2){let e=m().$implicit;h((e.meta==null?null:e.meta.count)!==void 0&&(e.meta==null?null:e.meta.count)!==null?0:1)}}function Li(t,i){if(t&1){let e=v();r(0,"tr",29),L("click",function(){let n=f(e).$implicit,l=m(2);return y(l.open(n))})("keydown.enter",function(){let n=f(e).$implicit,l=m(2);return y(l.open(n))}),r(1,"td",30),c(2),p(3,"date"),s(),g(4,bi,2,1,"td",31),r(5,"td",31),c(6),p(7,"userName"),p(8,"translate"),s(),r(9,"td"),C(10,"app-status-badge",32),p(11,"translate"),s(),r(12,"td",31),c(13),p(14,"translate"),s(),r(15,"td",33),c(16),s(),r(17,"td",34),W(18,xi,3,2,null,null,Vt,!1,vi,2,1),s()()}if(t&2){let e=i.$implicit,a=m(2);o(2),u(j(3,8,e.timestamp,"yyyy-MM-dd HH:mm:ss")),o(2),h(a.staff()?4:-1),o(2),u(d(7,11,e.user)||d(8,13,"systemLogs.systemUser")),o(4),_("value",d(11,15,"systemLogs.actions."+e.action))("severity",a.actionSeverity(e.action)),o(3),u(d(14,17,a.resourceLabel(e.resource))),o(3),u(e.object_repr||e.object_id||"\u2014"),o(2),K(a.changeRows(e.changes))}}function Si(t,i){if(t&1&&(r(0,"tr")(1,"td"),C(2,"app-empty-state",36),s()()),t&2){let e=m(2);o(),T("colspan",e.staff()?7:6)}}function Ti(t,i){if(t&1){let e=v();r(0,"div",2)(1,"div",5)(2,"p-iconfield",6),C(3,"p-inputicon",7),r(4,"input",8),p(5,"translate"),L("input",function(n){f(e);let l=m();return y(l.table.searchDraft.set(n.target.value))})("keydown.enter",function(){f(e);let n=m();return y(n.table.apply())}),s()(),g(6,ci,3,10,"p-select",9)(7,ui,3,10,"p-select",9),r(8,"p-multiselect",10),p(9,"translate"),p(10,"translate"),p(11,"translate"),B("ngModelChange",function(n){f(e);let l=m();return M(l.actions,n)||(l.actions=n),y(n)}),s(),g(12,_i,4,14,"p-multiselect",11),r(13,"p-multiselect",12),p(14,"translate"),p(15,"translate"),p(16,"translate"),B("ngModelChange",function(n){f(e);let l=m();return M(l.sources,n)||(l.sources=n),y(n)}),s(),r(17,"label",13)(18,"span",14),c(19),p(20,"translate"),s(),r(21,"input",15),B("ngModelChange",function(n){f(e);let l=m();return M(l.dateFrom,n)||(l.dateFrom=n),y(n)}),s()(),r(22,"label",13)(23,"span",14),c(24),p(25,"translate"),s(),r(26,"input",15),B("ngModelChange",function(n){f(e);let l=m();return M(l.dateTo,n)||(l.dateTo=n),y(n)}),s()(),g(27,fi,1,1,"app-saved-views",16),r(28,"p-button",17),p(29,"translate"),L("onClick",function(){f(e);let n=m();return y(n.table.apply())}),s(),g(30,yi,2,4,"p-button",18),s(),r(31,"div",19)(32,"p-table",20),L("onLazyLoad",function(n){f(e);let l=m();return y(l.table.onLazyLoad(n))}),w(33,hi,21,19,"ng-template",21)(34,Li,21,19,"ng-template",22)(35,Si,3,1,"ng-template",23),s()()()}if(t&2){let e=m();o(4),_("placeholder",d(5,35,"systemLogs.hints.search"))("value",e.table.searchDraft()),o(2),h(e.staff()?6:7),o(2),I("ngModel",e.actions),_("options",e.actionOptions())("showClear",!0)("maxSelectedLabels",2)("selectedItemsLabel",d(9,37,"common.selectedCount"))("placeholder",d(10,39,"systemLogs.fields.action"))("ariaLabel",d(11,41,"systemLogs.fields.action")),o(4),h(e.scope()?-1:12),o(),I("ngModel",e.sources),_("options",e.sourceOptions())("showClear",!0)("maxSelectedLabels",2)("selectedItemsLabel",d(14,43,"common.selectedCount"))("placeholder",d(15,45,"systemLogs.fields.source"))("ariaLabel",d(16,47,"systemLogs.fields.source")),o(6),u(d(20,49,"systemLogs.fields.from")),o(2),I("ngModel",e.dateFrom),o(3),u(d(25,51,"systemLogs.fields.to")),o(2),I("ngModel",e.dateTo),o(),h(e.scope()?-1:27),o(),_("label",d(29,53,"common.apply"))("disabled",!e.table.changed()),o(2),h(e.table.filtered()?30:-1),o(2),_("value",e.table.rows())("lazy",!0)("lazyLoadOnInit",!1)("paginator",!0)("first",e.table.first())("rows",e.table.pageSize())("totalRecords",e.table.total())("rowsPerPageOptions",he(55,si))("loading",e.table.loading())}}function ki(t,i){t&1&&(r(0,"p",37),C(1,"i",43),c(2),p(3,"translate"),s()),t&2&&(o(2),A("",d(3,1,"common.loading")," "))}function Ei(t,i){if(t&1&&(r(0,"dt",14),c(1),p(2,"translate"),s(),r(3,"dd"),c(4),s()),t&2){let e=m(),a=m();o(),u(d(2,2,"systemLogs.fields.company")),o(3),u(a.companyLabel(e.company))}}function Ii(t,i){if(t&1&&(r(0,"span",40),c(1),s()),t&2){let e=m();o(),A("(",e.user==null?null:e.user.email,")")}}function Mi(t,i){if(t&1&&(r(0,"dt",14),c(1),p(2,"translate"),s(),r(3,"dd",44),c(4),p(5,"translate"),s()),t&2){let e=i.$implicit;o(),u(d(2,2,e.labelKey)),o(3),u(e.translateValue?d(5,4,e.value):e.value)}}function Bi(t,i){if(t&1&&(r(0,"tr",50)(1,"td",51),c(2),s(),r(3,"td",52),c(4),s(),r(5,"td",53),c(6),s()()),t&2){let e=i.$implicit;o(2),u(e.field),o(2),u(e.before),o(2),u(e.after)}}function Di(t,i){if(t&1&&(r(0,"div",45)(1,"table",47)(2,"thead",48)(3,"tr")(4,"th",49),c(5),p(6,"translate"),s(),r(7,"th",49),c(8),p(9,"translate"),s(),r(10,"th",49),c(11),p(12,"translate"),s()()(),r(13,"tbody"),W(14,Bi,7,3,"tr",50,Vt),s()()()),t&2){let e=m();o(5),u(d(6,3,"systemLogs.fields.field")),o(3),u(d(9,5,"systemLogs.fields.before")),o(3),u(d(12,7,"systemLogs.fields.after")),o(3),K(e)}}function Vi(t,i){t&1&&(r(0,"p",46),c(1),p(2,"translate"),s()),t&2&&(o(),u(d(2,1,"systemLogs.noChanges")))}function Ai(t,i){t&1&&g(0,Di,16,9,"div",45)(1,Vi,3,3,"p",46),t&2&&h(i.length?0:1)}function Oi(t,i){if(t&1&&(g(0,ki,4,3,"p",37),r(1,"dl",38)(2,"dt",14),c(3),p(4,"translate"),s(),r(5,"dd",39),c(6),p(7,"date"),s(),g(8,Ei,5,4),r(9,"dt",14),c(10),p(11,"translate"),s(),r(12,"dd"),c(13),p(14,"userName"),p(15,"translate"),g(16,Ii,2,1,"span",40),s(),r(17,"dt",14),c(18),p(19,"translate"),s(),r(20,"dd"),C(21,"app-status-badge",32),p(22,"translate"),s(),r(23,"dt",14),c(24),p(25,"translate"),s(),r(26,"dd"),c(27),p(28,"translate"),s(),r(29,"dt",14),c(30),p(31,"translate"),s(),r(32,"dd"),c(33),p(34,"translate"),s(),r(35,"dt",14),c(36),p(37,"translate"),s(),r(38,"dd",39),c(39),s(),r(40,"dt",14),c(41),p(42,"translate"),s(),r(43,"dd",41),c(44),s(),W(45,Mi,6,6,null,null,pi),s(),r(47,"h3",42),c(48),p(49,"translate"),s(),g(50,Ai,2,1)),t&2){let e,a=i,n=m();h(n.loadingDetail()?0:-1),o(3),u(d(4,21,"systemLogs.fields.time")),o(3),u(j(7,23,a.timestamp,"yyyy-MM-dd HH:mm:ss")),o(2),h(n.staff()?8:-1),o(2),u(d(11,26,"systemLogs.fields.user")),o(3),A(" ",d(14,28,a.user)||d(15,30,"systemLogs.systemUser")," "),o(3),h(a.user!=null&&a.user.email?16:-1),o(2),u(d(19,32,"systemLogs.fields.action")),o(3),_("value",d(22,34,"systemLogs.actions."+a.action))("severity",n.actionSeverity(a.action)),o(3),u(d(25,36,"systemLogs.fields.record")),o(3),ye("",d(28,38,n.resourceLabel(a.resource))," \u2014 ",a.object_repr||a.object_id||"\u2014"),o(3),u(d(31,40,"systemLogs.fields.source")),o(3),u(d(34,42,"systemLogs.sources."+a.source)),o(3),u(d(37,44,"systemLogs.fields.ip")),o(3),u(a.ip_address||"\u2014"),o(2),u(d(42,46,"systemLogs.fields.device")),o(3),u(a.user_agent||"\u2014"),o(),K(n.metaRows(a.meta)),o(3),u(d(49,48,"systemLogs.fields.changes")),o(2),h((e=n.changeRows(a.changes))?50:-1,e)}}var Ni=["user","companyuser","salesorderline","deliverynoteline","journalline","stockreservation"];function zi(t){let i=At(t);for(let e of Ni)i.set(e,`systemLogs.resources.${e}`);return i}function At(t){let i=new Map;for(let e of t)e.permission?.startsWith("view_")&&i.set(e.permission.slice(5),e.labelKey),At(e.children??[]).forEach((a,n)=>i.set(n,a));return i}var Dt=class t{api=x(Tt);users=x(bt);companies=x(ht);notifications=x(je);language=x(Ke);staff=x(We).isStaff;scope=O(null);actions=[];resources=[];sources=[];user=null;company=null;dateFrom="";dateTo="";table=new ft(i=>this.api.list(q(V({},i),{ordering:i.ordering??"-timestamp",filters:this.scoped(i.filters)})),{filters:()=>({action:this.actions,resource:this.resources,source:this.sources,user:this.user,company:this.company,date_from:this.dateFrom,date_to:this.dateTo}),reset:()=>{this.actions=[],this.resources=[],this.sources=[],this.user=null,this.company=null,this.dateFrom="",this.dateTo=""},restore:i=>{this.actions=U(i.action),this.resources=U(i.resource),this.sources=U(i.source),this.user=i.user===void 0?null:Number(i.user),this.company=i.company===void 0?null:Number(i.company),this.dateFrom=String(i.date_from??""),this.dateTo=String(i.date_to??"")}});errorTitleKey=gt;resourceLabelKeys=zi(Qe);actionKeys=xt.map(i=>[i,`systemLogs.actions.${i}`]);sourceKeys=wt.map(i=>[i,`systemLogs.sources.${i}`]);labels=ke(x(Ee).stream([...this.resourceLabelKeys.values(),...this.actionKeys.map(([,i])=>i),...this.sourceKeys.map(([,i])=>i)]),{initialValue:{}});resourceOptions=S(()=>this.options([...this.resourceLabelKeys]));actionOptions=S(()=>this.options(this.actionKeys));sourceOptions=S(()=>this.options(this.sourceKeys));userOptions=N([]);companyOptions=N([]);companyNames=S(()=>new Map(this.companyOptions().map(i=>[Number(i.value),i.label])));exporting=N(!1);headerActions=S(()=>[{label:"systemLogs.export",icon:this.exporting()?"pi pi-spin pi-spinner":"pi pi-file-excel",severity:"secondary",disabled:this.exporting(),onClick:()=>this.export()}]);selected=N(null);loadingDetail=N(!1);changeRows=vt;metaRows=St;ngOnInit(){this.table.load(),this.staff()?this.companies.all().subscribe({next:i=>this.companyOptions.set(i.map(e=>({value:e.id,label:e.name}))),error:()=>{}}):this.users.userOptions().subscribe({next:i=>this.userOptions.set(i),error:()=>{}})}scoped(i){let e=this.scope();return e?q(V({},i),{resource:e.join(",")}):V({},i)}options(i){let e=this.labels();return i.map(([a,n])=>({value:a,label:e[n]??n}))}companyLabel(i){return Lt(i,this.companyNames())}resourceLabel(i){return this.resourceLabelKeys.get(i)??i}actionSeverity(i){return Ct[i]??"secondary"}export(){this.exporting.set(!0),this.api.exportXlsx(this.table.appliedQuery()).subscribe({next:i=>{this.exporting.set(!1),yt(i,`system-log_${new Date().toISOString().slice(0,10)}.xlsx`)},error:i=>{this.exporting.set(!1),this.notifications.error(i.message)}})}open(i){this.selected.set(i),this.loadingDetail.set(!0),this.api.retrieve(i.id).subscribe({next:e=>{this.selected()?.id===i.id&&(this.selected.set(e),this.loadingDetail.set(!1))},error:()=>{this.selected()?.id===i.id&&this.loadingDetail.set(!1)}})}close(){this.selected.set(null),this.loadingDetail.set(!1)}static \u0275fac=function(e){return new(e||t)};static \u0275cmp=$({type:t,selectors:[["app-system-log-list"]],inputs:{scope:[1,"scope"]},decls:6,vars:9,consts:[["title","systemLogs.title","subtitle","systemLogs.subtitle",3,"actions"],[3,"title","showRetry"],[1,"overflow-hidden","rounded-2xl","border","border-gray-200","bg-white","shadow-sm","dark:border-gray-800","dark:bg-gray-900"],["appendTo","body","styleClass","w-full sm:w-[36rem]",3,"visibleChange","visible","modal","position","header"],[3,"retry","title","showRetry"],[1,"flex","flex-col","flex-wrap","gap-3","border-b","border-gray-100","p-4","sm:flex-row","sm:items-center","dark:border-gray-800"],[1,"w-full","sm:w-64"],[1,"pi","pi-search"],["pInputText","","type","search",1,"w-full",3,"input","keydown.enter","placeholder","value"],["optionLabel","label","optionValue","value","styleClass","w-full sm:w-56","appendTo","body",3,"ngModel","options","filter","showClear","placeholder","ariaLabel"],["optionLabel","label","optionValue","value","styleClass","w-full sm:w-48","appendTo","body",3,"ngModelChange","ngModel","options","showClear","maxSelectedLabels","selectedItemsLabel","placeholder","ariaLabel"],["optionLabel","label","optionValue","value","styleClass","w-full sm:w-52","appendTo","body",3,"ngModel","options","filter","showClear","maxSelectedLabels","selectedItemsLabel","placeholder","ariaLabel"],["optionLabel","label","optionValue","value","styleClass","w-full sm:w-44","appendTo","body",3,"ngModelChange","ngModel","options","showClear","maxSelectedLabels","selectedItemsLabel","placeholder","ariaLabel"],[1,"flex","items-center","gap-2","text-sm"],[1,"text-gray-500","dark:text-gray-400"],["pInputText","","type","date",1,"w-full","sm:w-40",3,"ngModelChange","ngModel"],["screen","system-log",3,"table"],["icon","pi pi-filter","styleClass","w-full sm:w-auto",3,"onClick","label","disabled"],["icon","pi pi-filter-slash","severity","secondary","styleClass","w-full sm:w-auto",3,"label","text"],[1,"overflow-x-auto"],["dataKey","id","size","small",3,"onLazyLoad","value","lazy","lazyLoadOnInit","paginator","first","rows","totalRecords","rowsPerPageOptions","loading"],["pTemplate","header"],["pTemplate","body"],["pTemplate","emptymessage"],["optionLabel","label","optionValue","value","styleClass","w-full sm:w-56","appendTo","body",3,"ngModelChange","ngModel","options","filter","showClear","placeholder","ariaLabel"],["optionLabel","label","optionValue","value","styleClass","w-full sm:w-52","appendTo","body",3,"ngModelChange","ngModel","options","filter","showClear","maxSelectedLabels","selectedItemsLabel","placeholder","ariaLabel"],["icon","pi pi-filter-slash","severity","secondary","styleClass","w-full sm:w-auto",3,"onClick","label","text"],["pSortableColumn","timestamp"],["field","timestamp"],["tabindex","0",1,"cursor-pointer","hover:bg-gray-50","dark:hover:bg-gray-800/50",3,"click","keydown.enter"],["dir","ltr",1,"whitespace-nowrap","text-xs"],[1,"whitespace-nowrap"],[3,"value","severity"],[1,"max-w-xs","truncate","font-medium"],[1,"max-w-sm","truncate","text-xs","text-gray-500","dark:text-gray-400"],["dir","ltr"],["icon","pi-history"],["role","status",1,"mb-3","flex","items-center","gap-2","text-xs","text-gray-500","dark:text-gray-400"],[1,"grid","grid-cols-[auto_1fr]","gap-x-4","gap-y-2","text-sm"],["dir","ltr",1,"text-start"],["dir","ltr",1,"text-xs","text-gray-500","dark:text-gray-400"],["dir","ltr",1,"break-all","text-start","text-xs"],[1,"mb-2","mt-6","font-semibold"],["aria-hidden","true",1,"pi","pi-spin","pi-spinner"],[1,"break-all"],[1,"overflow-x-auto","rounded-lg","border","border-gray-200","dark:border-gray-800"],[1,"text-sm","text-gray-500","dark:text-gray-400"],[1,"w-full","text-sm"],[1,"bg-gray-50","text-start","dark:bg-gray-800/50"],[1,"p-2","text-start"],[1,"border-t","border-gray-100","align-top","dark:border-gray-800"],["dir","ltr",1,"p-2","font-mono","text-xs"],[1,"break-all","p-2","text-red-700","dark:text-red-400"],[1,"break-all","p-2","text-green-700","dark:text-green-400"]],template:function(e,a){if(e&1&&(g(0,di,1,1,"app-page-header",0),g(1,mi,1,2,"app-error-state",1)(2,Ti,36,56,"div",2),r(3,"p-drawer",3),p(4,"translate"),L("visibleChange",function(l){return l||a.close()}),g(5,Oi,51,50),s()),e&2){let n,l;h(a.scope()?-1:0),o(),h((n=a.table.error())?1:2,n),o(2),_("visible",!!a.selected())("modal",!0)("position",a.language.direction()==="rtl"?"left":"right")("header",d(4,7,"systemLogs.detailTitle")),o(2),h((l=a.selected())?5:-1,l)}},dependencies:[kt,qe,He,Ze,Ue,pt,rt,Q,st,lt,ze,Z,Bt,te,Xe,Ge,Je,Ye,tt,et,nt,it,at,ot,ct,dt,mt,ut,Se,Ie,_t],encapsulation:2,changeDetection:0})};export{te as a,Bt as b,Dt as c};
