//(function() {
var menuInTitlebar = {
  _prefName: "browser.menu.inTitlebar",
  handleEvent: function layoutPlan__handleEvent(aEvent) {
    switch (aEvent.type) {
      case "load":
        this.init();
        break;
      case "unload":
        this.uninit();
        break;
      case "aftercustomization":
        document.getElementById("menubar-placeholder").setAttribute("hidden","true");
        break;
      case "beforecustomization":
        document.getElementById("menubar-placeholder").setAttribute("hidden","false");
        break;
      case "DOMAttrModified":
        if(aEvent.attrName == "autohide" && aEvent.target.id == "toolbar-menubar")
          this.syncUI();
        break;
    }
  },
  init: function menuInTitlebar__init(){
    var _onViewToolbarsPopupShowing = onViewToolbarsPopupShowing.bind(window);
    onViewToolbarsPopupShowing = (function(aEvent, aInsertPoint) {
      _onViewToolbarsPopupShowing(aEvent, aInsertPoint);
      var popup = aEvent.target;
      if (popup != aEvent.currentTarget || popup.id == "appmenu_customizeMenu")
        return;
      var menuseparator = popup.getElementsByTagName("menuseparator")[0];
      var menuitem =  popup.getElementsByAttribute("command","cmd_ToggleMenuInTitlebar")[0];
      if(!menuitem){
        menuitem = document.createElement("menuitem");
        menuitem.setAttribute("command", "cmd_ToggleMenuInTitlebar");
        menuitem.setAttribute("type", "checkbox");
      }
      popup.insertBefore(menuitem,menuseparator.nextSibling);
    }).bind(window);
    this.syncUI();

    var toolbox = document.getElementById("navigator-toolbox");
    toolbox.addEventListener("aftercustomization",this,false)
    toolbox.addEventListener("beforecustomization",this,false)
    var menubar = document.getElementById("navigator-toolbox");
    menubar.addEventListener("DOMAttrModified",this,false)

    Application.prefs.get(this._prefName).events.addListener("change", this.syncUI.bind(this));
    Application.prefs.get("browser.tabs.onTop").events.addListener("change", this.syncUI.bind(this));
    Application.prefs.get("browser.tabs.drawInTitlebar").events.addListener("change", this.syncUI.bind(this));
  },

  uninit: function menuInTitlebar__uninit(){
    var toolbox = document.getElementById("navigator-toolbox");
    toolbox.removeEventListener("aftercustomization",this,false)
    toolbox.removeEventListener("beforecustomization",this,false)
    var menubar = document.getElementById("navigator-toolbox");
    menubar.removeEventListener("DOMAttrModified",this,false)
    Application.prefs.get(this._prefName).events.removeListener("change", this.syncUI);
    Application.prefs.get("browser.tabs.onTop").events.removeListener("change", this.syncUI);
    Application.prefs.get("browser.tabs.drawInTitlebar").events.removeListener("change", this.syncUI);
  },

  toggle: function () {
    this.enabled = !this.enabled;
  },

  get enabled () {
    var toolbar = document.getElementById("toolbar-menubar");
    var sysbox = document.getElementById("titlebar-content");
    var menuitem = document.getElementById("menubar-items");

    var autohide = toolbar.getAttribute("autohide");
    var titlebarmenu = Services.prefs.getBoolPref(this._prefName);
    var onTop = Services.prefs.getBoolPref("browser.tabs.onTop");
    var drawInTitlebar = Services.prefs.getBoolPref("browser.tabs.drawInTitlebar");
    return autohide == "true" && titlebarmenu && !(onTop && drawInTitlebar);
  },

  set enabled (val) {
    if(val){
      if(Services.prefs.getBoolPref("browser.tabs.onTop"))
        Services.prefs.setBoolPref("browser.tabs.drawInTitlebar",false);
      var toolbar = document.getElementById("toolbar-menubar");
      toolbar && setToolbarVisibility(toolbar,false);
    }
    Services.prefs.setBoolPref(this._prefName, !!val);
    return val;
  },

  syncUI: function menuInTitlebar__syncUI(){
    document.getElementById("cmd_ToggleMenuInTitlebar").setAttribute("checked", this.enabled);
    var toolbar = document.getElementById("toolbar-menubar");
    var sysbox = document.getElementById("titlebar-content");
    var menuitem = document.getElementById("menubar-items");
    if(this.enabled){
      sysbox.insertBefore(menuitem,document.getElementById("titlebar-buttonbox-container"))
    }
    else{
      toolbar.insertBefore(menuitem,toolbar.firstChlid)
    }      
  },
}
window.addEventListener('load'  , menuInTitlebar, false);
window.addEventListener('unload'  , menuInTitlebar, false);
//})();
var layoutPlan = {
  getSet: function (set,exception){
    var list = set.split(",");
    var exlist = exception.split(",");
    for(var i = 0; i < exlist.length ; i ++){
      var index = list.indexOf(exlist[i]);
      if( -1 != index)
        list.splice(index,1);
    }
    return list.join(",");
  },
  BrowserCustomizeToolbar: function (){
    // Disable the toolbar context menu items
    var menubar = document.getElementById("main-menubar");
    for (var i = 0; i < menubar.childNodes.length; ++i)
      menubar.childNodes[i].setAttribute("disabled", true);
  
    var cmd = document.getElementById("cmd_CustomizeToolbars");
    cmd.setAttribute("disabled", "true");
  
    var splitter = document.getElementById("urlbar-search-splitter");
    if (splitter)
      splitter.parentNode.removeChild(splitter);
  
    CombinedStopReload.uninit();
  
    PlacesToolbarHelper.customizeStart();
    BookmarksMenuButton.customizeStart();
    DownloadsButton.customizeStart();
  
    TabsInTitlebar.allowedBy("customizing-toolbars", false);
  },
  dispatchCustomizeDoneEvent: function() {
    var evt = document.createEvent("Events");
    evt.initEvent("aftercustomization", true, true);
    var toolbox = document.getElementById("navigator-toolbox");
    toolbox.dispatchEvent(evt);
  },
  setup: function layoutPlan__setup(event){
    this.BrowserCustomizeToolbar();
    var plan = event.target.getAttribute("plan");
    this.setupMenubar(plan);
    this.setupTabsbar(plan);
    var set = this.setupNavbar(plan);
    this.setupPersonalbar(plan,set);
    this.setupAddonbar(plan);
    BrowserToolboxCustomizeDone(true);
    this.dispatchCustomizeDoneEvent();
    menuInTitlebar.syncUI();
  },
  
  setupMenubar: function layoutPlan__setupMenubar(plan){
    var toolbar = document.getElementById("toolbar-menubar");
    var newSet = toolbar.getAttribute("defaultset");
    var autohide = false;
    var mit = false;
    if(plan == "default"){
      autohide = true;
    }else if(plan == "classic"){
      autohide = false;
    }else if(plan == "china"){
      autohide = true;
      mit = true;
      newSet = "";
    }else
      return;
    toolbar.currentSet = newSet;
    toolbar.setAttribute("currentset", newSet);
    document.persist(toolbar.id, "currentset");
    setToolbarVisibility(toolbar,!autohide);
    menuInTitlebar.enabled = mit;

  },
  setupAddonbar: function layoutPlan__setupAddonbar(plan){
    var toolbar = window.document.getElementById("addon-bar");
    var newSet = toolbar.getAttribute("defaultset");
    if(plan == "default"){
    }else if(plan == "classic"){
    }else if(plan == "china"){
    }else
      return;
    toolbar.currentSet = newSet;
    toolbar.setAttribute("currentset", newSet);
    document.persist(toolbar.id, "currentset");
    setToolbarVisibility(toolbar,true);

  },
  setupTabsbar: function layoutPlan__setupTabsbar(plan){
    if(plan == "default"){
      Application.prefs.setValue("browser.tabs.onTop",true);
      Application.prefs.setValue("browser.tabs.drawInTitlebar",true);
    }else if(plan == "classic"){
      Application.prefs.setValue("browser.tabs.onTop",false);
      Application.prefs.setValue("browser.tabs.drawInTitlebar",false);
    }else if(plan == "china"){
      Application.prefs.setValue("browser.tabs.onTop",false);
      Application.prefs.setValue("browser.tabs.drawInTitlebar",false);
    }else
      return;
  },
  setupNavbar: function layoutPlan__setupNavbar(plan){
    var toolbar = window.document.getElementById("nav-bar");
    var newSet = toolbar.getAttribute("defaultset");
    var innage = "";
    if(plan == "default"){
    }else if(plan == "classic"){
      newSet = "unified-back-forward-button,reload-button,spring,stop-button,home-button,urlbar-container,search-container";
      newSet = newSet + "," + this.getSet(toolbar.getAttribute("defaultset"),newSet);
    }else if(plan == "china"){
      newSet = "unified-back-forward-button,reload-button,stop-button,home-button,urlbar-container,search-container";
      innage = this.getSet(toolbar.getAttribute("defaultset"),newSet);
    }else
      return;
    toolbar.currentSet = newSet;
    toolbar.setAttribute("currentset", newSet);
    document.persist(toolbar.id, "currentset");
    setToolbarVisibility(toolbar,true);
    return innage;
  },
  
  setupPersonalbar: function layoutPlan__setupPersonalbar(plan,set){
    var toolbar = window.document.getElementById("PersonalToolbar");
    var newSet = toolbar.getAttribute("defaultset");
    if(plan == "default"){
    }else if(plan == "classic"){
    }else if(plan == "china"){
      newSet = newSet + ",spacer," + set;
    }else
      return;
    toolbar.currentSet = newSet;
    toolbar.setAttribute("currentset", newSet);
    document.persist(toolbar.id, "currentset");
    setToolbarVisibility(toolbar,true);

    return set;
  },
}


TabsOnTop.init = (function() {
    Services.prefs.addObserver(this._prefName, this, false);
}).bind(TabsOnTop);
