import{a as Wt}from"./chunk-FHH3CU3X.js";import"./chunk-YEPTRF3T.js";import"./chunk-BWEQ6TC5.js";import"./chunk-V5IG6ZV6.js";import"./chunk-G2IY67M5.js";import"./chunk-EMOTXQS5.js";import"./chunk-HZBA4LZE.js";import{a as Ot,b as zt}from"./chunk-SU7CHGQG.js";import"./chunk-ZHF7UXTC.js";import"./chunk-7I3HT2FX.js";import"./chunk-SPV3IFGE.js";import"./chunk-Z3Q7AQJL.js";import"./chunk-SFVTILEI.js";import"./chunk-PJQCAFQ4.js";import"./chunk-3LKQRG6D.js";import"./chunk-MYQL5ITY.js";import"./chunk-SNBNYYMM.js";import{a as Qt,b as qt}from"./chunk-CCE5AESK.js";import"./chunk-E7HTJMY3.js";import"./chunk-SQZL6C3F.js";import"./chunk-UXNKBRZP.js";import"./chunk-G7KI7K3V.js";import"./chunk-33TGULWS.js";import"./chunk-PDQPFMPU.js";import"./chunk-6SE6LSK2.js";import"./chunk-ZTLH3CBX.js";import{a as $t,b as Ht}from"./chunk-RCMF72ZY.js";import"./chunk-YTTMMKDC.js";import"./chunk-C5NN4LXV.js";import"./chunk-OQSE3LEI.js";import"./chunk-K5KSXR7T.js";import"./chunk-H26JGED4.js";import"./chunk-WRBNS2MA.js";import"./chunk-CTS3APCB.js";import"./chunk-EKIWM5ST.js";import"./chunk-7IL2SKEP.js";import"./chunk-XZXWGSCG.js";import"./chunk-3VZOIJIU.js";import"./chunk-YPEKISGI.js";import"./chunk-JXVXFWEK.js";import"./chunk-CC5RJ2BR.js";import"./chunk-U25YJXWM.js";import"./chunk-H74QBLZM.js";import{a as Kt}from"./chunk-TIEDE4FI.js";import{B as Rt,C as Pt,D as J,Fa as ft,Ga as jt,J as ut,M as X,V as Vt,da as st,ea as bt,f as dt,pa as j,r as pt,ra as $,sa as H,ta as v,u as At,ua as B}from"./chunk-Z4BQ6JTC.js";import"./chunk-VNLTB6LX.js";import{f as Ft,g as Lt}from"./chunk-MOMGFH4J.js";import{$ as h,$a as Ct,Aa as I,Da as b,Ea as f,Fb as O,Ga as xt,Gb as z,H as Q,Ha as et,I as M,Ia as nt,J as ht,Ja as m,Jb as kt,K as S,Ka as c,La as d,Lb as u,M as s,Ma as E,Ob as w,P as q,Q as W,Qb as Mt,R as ct,Sa as it,Sb as at,Ta as U,Ua as Tt,Va as D,Vb as k,Wb as St,Xa as p,Y as F,Ya as R,Z as tt,Za as P,_a as Dt,aa as _t,ab as y,bb as x,cb as wt,dc as ot,eb as Bt,fb as Nt,ga as l,hc as G,ic as rt,jb as g,kb as _,lb as C,mb as It,na as T,oa as yt,ra as L,sa as A,ta as N,wb as V,yb as Et}from"./chunk-YVCT7M3L.js";import"./chunk-YEWEO3AL.js";var Ut=`
    .p-tabs {
        display: flex;
        flex-direction: column;
    }

    .p-tablist {
        display: flex;
        position: relative;
        overflow: hidden;
        background: dt('tabs.tablist.background');
    }

    .p-tablist-viewport {
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: none;
        overscroll-behavior: contain auto;
    }

    .p-tablist-viewport::-webkit-scrollbar {
        display: none;
    }

    .p-tablist-tab-list {
        position: relative;
        display: flex;
        border-style: solid;
        border-color: dt('tabs.tablist.border.color');
        border-width: dt('tabs.tablist.border.width');
    }

    .p-tablist-content {
        flex-grow: 1;
    }

    .p-tablist-nav-button {
        all: unset;
        position: absolute !important;
        flex-shrink: 0;
        inset-block-start: 0;
        z-index: 2;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: dt('tabs.nav.button.background');
        color: dt('tabs.nav.button.color');
        width: dt('tabs.nav.button.width');
        transition:
            color dt('tabs.transition.duration'),
            outline-color dt('tabs.transition.duration'),
            box-shadow dt('tabs.transition.duration');
        box-shadow: dt('tabs.nav.button.shadow');
        outline-color: transparent;
        cursor: pointer;
    }

    .p-tablist-nav-button:focus-visible {
        z-index: 1;
        box-shadow: dt('tabs.nav.button.focus.ring.shadow');
        outline: dt('tabs.nav.button.focus.ring.width') dt('tabs.nav.button.focus.ring.style') dt('tabs.nav.button.focus.ring.color');
        outline-offset: dt('tabs.nav.button.focus.ring.offset');
    }

    .p-tablist-nav-button:hover {
        color: dt('tabs.nav.button.hover.color');
    }

    .p-tablist-prev-button {
        inset-inline-start: 0;
    }

    .p-tablist-next-button {
        inset-inline-end: 0;
    }

    .p-tablist-prev-button:dir(rtl),
    .p-tablist-next-button:dir(rtl) {
        transform: rotate(180deg);
    }

    .p-tab {
        flex-shrink: 0;
        cursor: pointer;
        user-select: none;
        position: relative;
        border-style: solid;
        white-space: nowrap;
        gap: dt('tabs.tab.gap');
        background: dt('tabs.tab.background');
        border-width: dt('tabs.tab.border.width');
        border-color: dt('tabs.tab.border.color');
        color: dt('tabs.tab.color');
        padding: dt('tabs.tab.padding');
        font-weight: dt('tabs.tab.font.weight');
        transition:
            background dt('tabs.transition.duration'),
            border-color dt('tabs.transition.duration'),
            color dt('tabs.transition.duration'),
            outline-color dt('tabs.transition.duration'),
            box-shadow dt('tabs.transition.duration');
        margin: dt('tabs.tab.margin');
        outline-color: transparent;
    }

    .p-tab:not(.p-disabled):focus-visible {
        z-index: 1;
        box-shadow: dt('tabs.tab.focus.ring.shadow');
        outline: dt('tabs.tab.focus.ring.width') dt('tabs.tab.focus.ring.style') dt('tabs.tab.focus.ring.color');
        outline-offset: dt('tabs.tab.focus.ring.offset');
    }

    .p-tab:not(.p-tab-active):not(.p-disabled):hover {
        background: dt('tabs.tab.hover.background');
        border-color: dt('tabs.tab.hover.border.color');
        color: dt('tabs.tab.hover.color');
    }

    .p-tab-active {
        background: dt('tabs.tab.active.background');
        border-color: dt('tabs.tab.active.border.color');
        color: dt('tabs.tab.active.color');
    }

    .p-tabpanels {
        background: dt('tabs.tabpanel.background');
        color: dt('tabs.tabpanel.color');
        padding: dt('tabs.tabpanel.padding');
        outline: 0 none;
    }

    .p-tabpanel:focus-visible {
        box-shadow: dt('tabs.tabpanel.focus.ring.shadow');
        outline: dt('tabs.tabpanel.focus.ring.width') dt('tabs.tabpanel.focus.ring.style') dt('tabs.tabpanel.focus.ring.color');
        outline-offset: dt('tabs.tabpanel.focus.ring.offset');
    }

    .p-tablist-active-bar {
        z-index: 1;
        display: block;
        position: absolute;
        inset-block-end: dt('tabs.active.bar.bottom');
        height: dt('tabs.active.bar.height');
        background: dt('tabs.active.bar.background');
        transition: 250ms cubic-bezier(0.35, 0, 0.25, 1);
    }
`;var Y=["*"],pe=["previcon"],ue=["nexticon"],oe=["content"],be=["prevButton"],fe=["nextButton"],me=["inkbar"],ve=["tabs"];function ge(e,o){e&1&&it(0)}function he(e,o){if(e&1&&N(0,ge,1,0,"ng-container",11),e&2){let t=p(2);m("ngTemplateOutlet",t.prevIconTemplate||t._prevIconTemplate)}}function _e(e,o){e&1&&(ct(),E(0,"svg",10))}function ye(e,o){if(e&1){let t=U();c(0,"button",9,3),D("click",function(){q(t);let n=p();return W(n.onPrevButtonClick())}),b(2,he,1,1,"ng-container")(3,_e,1,0,":svg:svg",10),d()}if(e&2){let t=p();g(t.cx("prevButton")),m("pBind",t.ptm("prevButton")),I("aria-label",t.prevButtonAriaLabel)("tabindex",t.tabindex())("data-pc-group-section","navigator"),l(2),f(t.prevIconTemplate||t._prevIconTemplate?2:3)}}function xe(e,o){e&1&&it(0)}function Te(e,o){if(e&1&&N(0,xe,1,0,"ng-container",11),e&2){let t=p(2);m("ngTemplateOutlet",t.nextIconTemplate||t._nextIconTemplate)}}function De(e,o){e&1&&(ct(),E(0,"svg",12))}function Ce(e,o){if(e&1){let t=U();c(0,"button",9,4),D("click",function(){q(t);let n=p();return W(n.onNextButtonClick())}),b(2,Te,1,1,"ng-container")(3,De,1,0,":svg:svg",12),d()}if(e&2){let t=p();g(t.cx("nextButton")),m("pBind",t.ptm("nextButton")),I("aria-label",t.nextButtonAriaLabel)("tabindex",t.tabindex())("data-pc-group-section","navigator"),l(2),f(t.nextIconTemplate||t._nextIconTemplate?2:3)}}function we(e,o){e&1&&P(0)}function Be(e,o){e&1&&it(0)}function Ne(e,o){if(e&1&&N(0,Be,1,0,"ng-container",1),e&2){let t=p(),i=Nt(1);m("ngTemplateOutlet",t.content()?t.content():i)}}var Ie={root:({instance:e})=>["p-tabs p-component",{"p-tabs-scrollable":e.scrollable()}]},Gt=(()=>{class e extends j{name="tabs";style=Ut;classes=Ie;static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275prov=M({token:e,factory:e.\u0275fac})}return e})();var Jt=new S("TABS_INSTANCE"),K=(()=>{class e extends H{componentName="Tabs";$pcTabs=s(Jt,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=s(v,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}value=at(void 0);scrollable=w(!1,{transform:k});lazy=w(!1,{transform:k});selectOnFocus=w(!1,{transform:k});showNavigators=w(!0,{transform:k});tabindex=w(0,{transform:St});id=F(Vt("pn_id_"));_componentStyle=s(Gt);updateValue(t){this.value.update(()=>t)}static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275cmp=T({type:e,selectors:[["p-tabs"]],hostVars:3,hostBindings:function(i,n){i&2&&(I("id",n.id()),g(n.cx("root")))},inputs:{value:[1,"value"],scrollable:[1,"scrollable"],lazy:[1,"lazy"],selectOnFocus:[1,"selectOnFocus"],showNavigators:[1,"showNavigators"],tabindex:[1,"tabindex"]},outputs:{value:"valueChange"},features:[V([Gt,{provide:Jt,useExisting:e},{provide:$,useExisting:e}]),L([v]),A],ngContentSelectors:Y,decls:1,vars:0,template:function(i,n){i&1&&(R(),P(0))},dependencies:[G,B],encapsulation:2,changeDetection:0})}return e})(),Ee={root:({instance:e})=>["p-tab",{"p-tab-active":e.active(),"p-disabled":e.disabled()}]},Xt=(()=>{class e extends j{name="tab";classes=Ee;static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275prov=M({token:e,factory:e.\u0275fac})}return e})();var ke={root:"p-tablist",content:"p-tablist-content p-tablist-viewport",tabList:"p-tablist-tab-list",activeBar:"p-tablist-active-bar",prevButton:"p-tablist-prev-button p-tablist-nav-button",nextButton:"p-tablist-next-button p-tablist-nav-button"},Yt=(()=>{class e extends j{name="tablist";classes=ke;static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275prov=M({token:e,factory:e.\u0275fac})}return e})();var Zt=new S("TABLIST_INSTANCE"),lt=(()=>{class e extends H{componentName="TabList";$pcTabList=s(Zt,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=s(v,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}prevIconTemplate;nextIconTemplate;templates;content;prevButton;nextButton;inkbar;tabs;pcTabs=s(Q(()=>K));isPrevButtonEnabled=F(!1);isNextButtonEnabled=F(!1);resizeObserver;showNavigators=u(()=>this.pcTabs.showNavigators());tabindex=u(()=>this.pcTabs.tabindex());scrollable=u(()=>this.pcTabs.scrollable());_componentStyle=s(Yt);constructor(){super(),tt(()=>{this.pcTabs.value(),rt(this.platformId)&&setTimeout(()=>{this.updateInkBar()})})}get prevButtonAriaLabel(){return this.config?.translation?.aria?.previous}get nextButtonAriaLabel(){return this.config?.translation?.aria?.next}onAfterViewInit(){this.showNavigators()&&rt(this.platformId)&&(this.updateButtonState(),this.bindResizeObserver())}_prevIconTemplate;_nextIconTemplate;onAfterContentInit(){this.templates?.forEach(t=>{switch(t.getType()){case"previcon":this._prevIconTemplate=t.template;break;case"nexticon":this._nextIconTemplate=t.template;break}})}onDestroy(){this.unbindResizeObserver()}onScroll(t){this.showNavigators()&&this.updateButtonState(),t.preventDefault()}onPrevButtonClick(){let t=this.content.nativeElement,i=X(t),n=Math.abs(t.scrollLeft)-i,a=n<=0?0:n;t.scrollLeft=pt(t)?-1*a:a}onNextButtonClick(){let t=this.content.nativeElement,i=X(t)-this.getVisibleButtonWidths(),n=t.scrollLeft+i,a=t.scrollWidth-i,r=n>=a?a:n;t.scrollLeft=pt(t)?-1*r:r}updateButtonState(){let t=this.content?.nativeElement,i=this.el?.nativeElement,{scrollWidth:n,offsetWidth:a}=t,r=Math.abs(t.scrollLeft),Z=X(t);this.isPrevButtonEnabled.set(r!==0),this.isNextButtonEnabled.set(i.offsetWidth>=a&&Math.abs(r-n+Z)>1)}updateInkBar(){let t=this.content?.nativeElement,i=this.inkbar?.nativeElement,n=this.tabs?.nativeElement,a=Rt(t,'[data-pc-name="tab"][data-p-active="true"]');i&&(i.style.width=At(a)+"px",i.style.left=ut(a).left-ut(n).left+"px")}getVisibleButtonWidths(){let t=this.prevButton?.nativeElement,i=this.nextButton?.nativeElement;return[t,i].reduce((n,a)=>a?n+X(a):n,0)}bindResizeObserver(){this.resizeObserver=new ResizeObserver(()=>this.updateButtonState()),this.resizeObserver.observe(this.el.nativeElement)}unbindResizeObserver(){this.resizeObserver&&(this.resizeObserver.unobserve(this.el.nativeElement),this.resizeObserver=null)}static \u0275fac=function(i){return new(i||e)};static \u0275cmp=T({type:e,selectors:[["p-tablist"]],contentQueries:function(i,n,a){if(i&1&&Dt(a,pe,4)(a,ue,4)(a,st,4),i&2){let r;y(r=x())&&(n.prevIconTemplate=r.first),y(r=x())&&(n.nextIconTemplate=r.first),y(r=x())&&(n.templates=r)}},viewQuery:function(i,n){if(i&1&&Ct(oe,5)(be,5)(fe,5)(me,5)(ve,5),i&2){let a;y(a=x())&&(n.content=a.first),y(a=x())&&(n.prevButton=a.first),y(a=x())&&(n.nextButton=a.first),y(a=x())&&(n.inkbar=a.first),y(a=x())&&(n.tabs=a.first)}},hostVars:2,hostBindings:function(i,n){i&2&&g(n.cx("root"))},features:[V([Yt,{provide:Zt,useExisting:e},{provide:$,useExisting:e}]),L([v]),A],ngContentSelectors:Y,decls:9,vars:11,consts:[["content",""],["tabs",""],["inkbar",""],["prevButton",""],["nextButton",""],["type","button","pRipple","",3,"pBind","class"],[3,"scroll","pBind"],["role","tablist",3,"pBind"],["role","presentation",3,"pBind"],["type","button","pRipple","",3,"click","pBind"],["data-p-icon","chevron-left"],[4,"ngTemplateOutlet"],["data-p-icon","chevron-right"]],template:function(i,n){i&1&&(R(),b(0,ye,4,7,"button",5),c(1,"div",6,0),D("scroll",function(r){return n.onScroll(r)}),c(3,"div",7,1),P(5),E(6,"span",8,2),d()(),b(8,Ce,4,7,"button",5)),i&2&&(f(n.showNavigators()&&n.isPrevButtonEnabled()?0:-1),l(),g(n.cx("content")),m("pBind",n.ptm("content")),l(2),g(n.cx("tabList")),m("pBind",n.ptm("tabList")),l(3),g(n.cx("activeBar")),m("pBind",n.ptm("activeBar")),l(2),f(n.showNavigators()&&n.isNextButtonEnabled()?8:-1))},dependencies:[G,ot,Ot,zt,jt,ft,bt,B,v],encapsulation:2,changeDetection:0})}return e})(),te=new S("TAB_INSTANCE"),mt=(()=>{class e extends H{componentName="Tab";$pcTab=s(te,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=s(v,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}value=at();disabled=w(!1,{transform:k});pcTabs=s(Q(()=>K));pcTabList=s(Q(()=>lt));el=s(_t);_componentStyle=s(Xt);ripple=u(()=>this.config.ripple());id=u(()=>`${this.pcTabs.id()}_tab_${this.value()}`);ariaControls=u(()=>`${this.pcTabs.id()}_tabpanel_${this.value()}`);active=u(()=>dt(this.pcTabs.value(),this.value()));tabindex=u(()=>this.disabled()?-1:this.active()?this.pcTabs.tabindex():-1);mutationObserver;onFocus(t){this.disabled()||this.pcTabs.selectOnFocus()&&this.changeActiveValue()}onClick(t){this.disabled()||this.changeActiveValue()}onKeyDown(t){switch(t.code){case"ArrowRight":this.onArrowRightKey(t);break;case"ArrowLeft":this.onArrowLeftKey(t);break;case"Home":this.onHomeKey(t);break;case"End":this.onEndKey(t);break;case"PageDown":this.onPageDownKey(t);break;case"PageUp":this.onPageUpKey(t);break;case"Enter":case"NumpadEnter":case"Space":this.onEnterKey(t);break;default:break}t.stopPropagation()}onAfterViewInit(){this.bindMutationObserver()}onArrowRightKey(t){let i=this.findNextTab(t.currentTarget);i?this.changeFocusedTab(t,i):this.onHomeKey(t),t.preventDefault()}onArrowLeftKey(t){let i=this.findPrevTab(t.currentTarget);i?this.changeFocusedTab(t,i):this.onEndKey(t),t.preventDefault()}onHomeKey(t){let i=this.findFirstTab();this.changeFocusedTab(t,i),t.preventDefault()}onEndKey(t){let i=this.findLastTab();this.changeFocusedTab(t,i),t.preventDefault()}onPageDownKey(t){this.scrollInView(this.findLastTab()),t.preventDefault()}onPageUpKey(t){this.scrollInView(this.findFirstTab()),t.preventDefault()}onEnterKey(t){this.disabled()||this.changeActiveValue(),t.preventDefault()}findNextTab(t,i=!1){let n=i?t:t.nextElementSibling;return n?J(n,"data-p-disabled")||J(n,"data-pc-section")==="activebar"?this.findNextTab(n):n:null}findPrevTab(t,i=!1){let n=i?t:t.previousElementSibling;return n?J(n,"data-p-disabled")||J(n,"data-pc-section")==="activebar"?this.findPrevTab(n):n:null}findFirstTab(){return this.findNextTab(this.pcTabList?.tabs?.nativeElement?.firstElementChild,!0)}findLastTab(){return this.findPrevTab(this.pcTabList?.tabs?.nativeElement?.lastElementChild,!0)}changeActiveValue(){this.pcTabs.updateValue(this.value())}changeFocusedTab(t,i){Pt(i),this.scrollInView(i)}scrollInView(t){t?.scrollIntoView?.({block:"nearest"})}bindMutationObserver(){rt(this.platformId)&&(this.mutationObserver=new MutationObserver(t=>{t.forEach(()=>{this.active()&&this.pcTabList?.updateInkBar()})}),this.mutationObserver.observe(this.el.nativeElement,{childList:!0,characterData:!0,subtree:!0}))}unbindMutationObserver(){this.mutationObserver?.disconnect()}onDestroy(){this.mutationObserver&&this.unbindMutationObserver()}static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275cmp=T({type:e,selectors:[["p-tab"]],hostVars:10,hostBindings:function(i,n){i&1&&D("focus",function(r){return n.onFocus(r)})("click",function(r){return n.onClick(r)})("keydown",function(r){return n.onKeyDown(r)}),i&2&&(I("id",n.id())("aria-controls",n.ariaControls())("role","tab")("aria-selected",n.active())("aria-disabled",n.disabled())("data-p-disabled",n.disabled())("data-p-active",n.active())("tabindex",n.tabindex()),g(n.cx("root")))},inputs:{value:[1,"value"],disabled:[1,"disabled"]},outputs:{value:"valueChange"},features:[V([Xt,{provide:te,useExisting:e},{provide:$,useExisting:e}]),L([ft,v]),A],ngContentSelectors:Y,decls:1,vars:0,template:function(i,n){i&1&&(R(),P(0))},dependencies:[G,bt,B],encapsulation:2,changeDetection:0})}return e})(),Me={root:({instance:e})=>["p-tabpanel",{"p-tabpanel-active":e.active()}]},ee=(()=>{class e extends j{name="tabpanel";classes=Me;static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275prov=M({token:e,factory:e.\u0275fac})}return e})();var ne=new S("TABPANEL_INSTANCE"),vt=(()=>{class e extends H{componentName="TabPanel";$pcTabPanel=s(ne,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=s(v,{self:!0});pcTabs=s(Q(()=>K));onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}lazy=w(!1,{transform:k});value=at(void 0);content=Mt("content");id=u(()=>`${this.pcTabs.id()}_tabpanel_${this.value()}`);ariaLabelledby=u(()=>`${this.pcTabs.id()}_tab_${this.value()}`);active=u(()=>dt(this.pcTabs.value(),this.value()));isLazyEnabled=u(()=>this.pcTabs.lazy()||this.lazy());hasBeenRendered=!1;shouldRender=u(()=>!this.isLazyEnabled()||this.hasBeenRendered?!0:this.active()?(this.hasBeenRendered=!0,!0):!1);_componentStyle=s(ee);static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275cmp=T({type:e,selectors:[["p-tabpanel"]],contentQueries:function(i,n,a){i&1&&wt(a,n.content,oe,5),i&2&&Bt()},hostVars:7,hostBindings:function(i,n){i&2&&(Tt("hidden",!n.active()),I("id",n.id())("role","tabpanel")("aria-labelledby",n.ariaLabelledby())("data-p-active",n.active()),g(n.cx("root")))},inputs:{lazy:[1,"lazy"],value:[1,"value"]},outputs:{value:"valueChange"},features:[V([ee,{provide:ne,useExisting:e},{provide:$,useExisting:e}]),L([v]),A],ngContentSelectors:Y,decls:3,vars:1,consts:[["defaultContent",""],[4,"ngTemplateOutlet"]],template:function(i,n){i&1&&(R(),N(0,we,1,0,"ng-template",null,0,kt),b(2,Ne,1,1,"ng-container")),i&2&&(l(2),f(n.shouldRender()?2:-1))},dependencies:[ot,B],encapsulation:2,changeDetection:0})}return e})(),Se={root:"p-tabpanels"},ie=(()=>{class e extends j{name="tabpanels";classes=Se;static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275prov=M({token:e,factory:e.\u0275fac})}return e})();var ae=new S("TABPANELS_INSTANCE"),gt=(()=>{class e extends H{componentName="TabPanels";$pcTabPanels=s(ae,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=s(v,{self:!0});_componentStyle=s(ie);onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}static \u0275fac=(()=>{let t;return function(n){return(t||(t=h(e)))(n||e)}})();static \u0275cmp=T({type:e,selectors:[["p-tabpanels"]],hostVars:3,hostBindings:function(i,n){i&2&&(I("role","presentation"),g(n.cx("root")))},features:[V([ie,{provide:ae,useExisting:e},{provide:$,useExisting:e}]),L([v]),A],ngContentSelectors:Y,decls:1,vars:0,template:function(i,n){i&1&&(R(),P(0))},dependencies:[G,B],encapsulation:2,changeDetection:0})}return e})(),re=(()=>{class e{static \u0275fac=function(i){return new(i||e)};static \u0275mod=yt({type:e});static \u0275inj=ht({imports:[K,gt,vt,lt,mt,B,B]})}return e})();var Le=e=>[e],ce=(e,o)=>o.key;function Ae(e,o){if(e&1&&(_(0,": "),c(1,"span",6),_(2),d()),e&2){let t=p();l(2),C(t.name)}}function Re(e,o){if(e&1&&(c(0,"h2",3),E(1,"i",4),c(2,"span",5),_(3),O(4,"translate"),b(5,Ae,3,1),d()()),e&2){let t=o;l(3),It(" ",z(4,2,t.titleKey)),l(2),f(t.name?5:-1)}}function Pe(e,o){if(e&1&&b(0,Re,6,4,"h2",3),e&2){let t,i=p();f((t=i.details.current())?0:-1,t)}}function Ve(e,o){e&1&&(c(0,"p-tab",9),_(1),O(2,"translate"),d()),e&2&&(l(),C(z(2,1,"activityLog.button")))}function Oe(e,o){if(e&1&&(c(0,"h3",12),_(1),d()),e&2){let t=p().$implicit,i=p(2);l(),C(i.label(t.key))}}function ze(e,o){if(e&1&&(c(0,"div",14)(1,"dt",15),_(2),d(),c(3,"dd",16),_(4),O(5,"translate"),d()()),e&2){let t=o.$implicit,i=p(3);l(2),C(i.label(t.key)),l(2),C(t.translate?z(5,2,t.value):t.value)}}function je(e,o){if(e&1&&(c(0,"section",10),b(1,Oe,2,1,"h3",12),c(2,"dl",13),et(3,ze,6,4,"div",14,ce),d()()),e&2){let t=o.$implicit;l(),f(t.key?1:-1),l(2),nt(t.fields)}}function $e(e,o){e&1&&(c(0,"p",11),_(1),O(2,"translate"),d()),e&2&&(l(),C(z(2,1,"common.empty")))}function He(e,o){if(e&1&&E(0,"app-system-log-list",17),e&2){let t=p(2).$implicit;m("scope",Et(2,Le,t.resource))("objectId",t.objectId)}}function Ke(e,o){if(e&1&&(c(0,"p-tabpanel",9),b(1,He,1,4,"app-system-log-list",17),d()),e&2){let t=p(2);l(),f(t.tab()==="logs"?1:-1)}}function Qe(e,o){if(e&1){let t=U();c(0,"p-tabs",7),D("valueChange",function(n){q(t);let a=p();return W(a.tab.set(n))}),c(1,"p-tablist")(2,"p-tab",8),_(3),O(4,"translate"),d(),b(5,Ve,3,3,"p-tab",9),d(),c(6,"p-tabpanels")(7,"p-tabpanel",8),et(8,je,5,1,"section",10,ce,!1,$e,3,3,"p",11),d(),b(11,Ke,2,1,"p-tabpanel",9),d()()}if(e&2){let t=o.$implicit,i=p();m("value",i.tab()),l(3),C(z(4,5,"recordDetails.details")),l(2),f(t.showLogs&&t.resource?5:-1),l(3),nt(i.sections()),l(3),f(t.showLogs&&t.resource?11:-1)}}var se=["company","locations","inventory","sales","returns","accounting"],le=class e{details=s(qt);language=s(Kt);translate=s(Ft);tab=F("details");opened=u(()=>{let o=this.details.current();return o?[o]:[]});sections=u(()=>{let o=this.details.current();return o?Qt(o.record,this.language.currentLang()):[]});constructor(){tt(()=>{this.details.current(),this.tab.set("details")})}label(o){let t=o.replace(/_([a-z0-9])/g,(a,r)=>r.toUpperCase()),i=this.details.current()?.labelArea;for(let a of i?[i,...se.filter(r=>r!==i)]:se){let r=`${a}.fields.${t}`,Z=this.translate.instant(r);if(Z!==r)return Z}let n=o.replace(/_/g," ").trim();return n.charAt(0).toUpperCase()+n.slice(1)}static \u0275fac=function(t){return new(t||e)};static \u0275cmp=T({type:e,selectors:[["app-record-details-drawer"]],decls:4,vars:3,consts:[["styleClass","w-full lg:w-[56rem]",3,"visibleChange","visible","modal","position"],["pTemplate","header"],[3,"value"],[1,"flex","min-w-0","items-center","gap-2","text-lg","font-semibold","text-gray-900","dark:text-gray-100"],["aria-hidden","true",1,"pi","pi-eye","text-primary-600","dark:text-primary-300"],[1,"truncate"],["dir","auto"],[3,"valueChange","value"],["value","details"],["value","logs"],[1,"mb-5"],[1,"text-sm","text-gray-500","dark:text-gray-400"],[1,"mb-2","text-sm","font-semibold","text-gray-700","dark:text-gray-200"],[1,"grid","grid-cols-1","gap-x-6","gap-y-3","rounded-xl","border","border-gray-200","p-4","text-sm","sm:grid-cols-2","dark:border-gray-800"],[1,"min-w-0"],[1,"text-xs","text-gray-500","dark:text-gray-400"],["dir","auto",1,"mt-0.5","break-words"],[3,"scope","objectId"]],template:function(t,i){t&1&&(c(0,"p-drawer",0),D("visibleChange",function(a){return a||i.details.close()}),N(1,Pe,1,1,"ng-template",1),et(2,Qe,12,7,"p-tabs",2,xt),d()),t&2&&(m("visible",!!i.details.current())("modal",!0)("position",i.language.direction()==="rtl"?"left":"right"),l(2),nt(i.opened()))},dependencies:[st,Ht,$t,re,K,gt,vt,lt,mt,Wt,Lt],encapsulation:2,changeDetection:0})};export{le as RecordDetailsDrawerComponent};
