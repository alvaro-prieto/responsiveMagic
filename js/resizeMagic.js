/**
                                      _           __  __             _      
                                     (_)         |  \/  |           (_)     
  _ __ ___  ___ _ __   ___  _ __  ___ ___   _____| \  / | __ _  __ _ _  ___ 
 | '__/ _ \/ __| '_ \ / _ \| '_ \/ __| \ \ / / _ \ |\/| |/ _` |/ _` | |/ __|
 | | |  __/\__ \ |_) | (_) | | | \__ \ |\ V /  __/ |  | | (_| | (_| | | (__ 
 |_|  \___||___/ .__/ \___/|_| |_|___/_| \_/ \___|_|  |_|\__,_|\__, |_|\___|
               | |                                              __/ |       
               |_|                                             |___/        

 v1.0 - jQuery plugin created by Alvaro Prieto Lauroba.  Licences: MIT & GPL
 
*/

/*

   ¿Como me lo imagino?
   
   * agrega una clase específica por cada familia de dispositivo:
        iOS
        android
        blackBerry
        windowsPhone
        
    * posibilidades
        detectar si esta disponible el touch/hover 
    
    * agrega una clase por rangos de dimensiones físicas
        tiny
        smartphone
        tablet
        desktop
        huge
        
    * agrega una clase por orientacion
        landscape
        portrait

    * aplica zoom automáticamente y lo expone
        redimensiona el contenido del viewport
        posibilidad de agregar bordes (por resolucion)
        exponer al exterior la posicion del mouse
        posibilidad de multiples contenedores?
        aplica reglas css para fix de problemas iOS con el zoom
        modo debug, para previsualizar durante el desarrollo
        


*/






(function($){ 	
    
      
    var SIGNATURE = "resizeMagic";
    var INFINITY = 99999;
    var zoom = 1;
    var viewport = null;
    var screenWidth = 0;
    var body = $('body');
    var head = $('head');
    var html = $('html');
    var watchers = [];
    var handlers = {};
    var cssClasses = ""; 
    var displayClasses = "";
    var displayClassesSelector = "";
    var ranges = [];
    var currentRangeIndex = -1; 
    var currentRange = null;
    var options = {};
    var modes = {
        "tiny":     [0, 480],
        "small":    [481, 768],
        "medium":   [769, 1024],
        "big":      [1025, 1250],
        "huge":     [1251, INFINITY]
    };
    var magicContent = {
        "magic-src":    {
            "selector": '',
            "elements": null,
            "init": 'magicSrcInit', 
            "update": 'magicSrcUpdate'
        },
        "magic-text":    {
            "selector": '',
            "elements": null,
            "init": 'magicTextInit', 
            "update": 'magicTextUpdate'
        },
        "magic-hide":    {
            "selector": '',
            "elements": null,
            "init": 'magicHideInit', 
            "update": null
        },
        "magic-show":    {
            "selector": '',
            "elements": null,
            "init": 'magicShowInit', 
            "update": null
        }
    };
    var errors = [
        "RANGE ERROR: first range must start with 0", // 0  
        "RANGE ERROR: ranges malformation", // 1  
        "RANGE ERROR: at least 2 ranges are needed in order to use this plugin", //2
        "MATCHMEDIA ERROR: your browser does not support matchMedia. Use a polyfill for further compatibility" //3
    ];
    var styles = {
        ".resizeMagicDebug": "{font-size:20px; position: fixed; top: 0px; z-index: 99; opacity:0.6; color:black;}",
        ".resizeMagicDebug:hover": "{opacity:1; }",
        ".resizeMagicBtn": "{padding:10px; outline:none; border:1px solid #333; background-color:#bbb;}",
        ".resizeMagicBtn.active": "{background-color:lime; pointer-events:none;}",
        ".resizeMagicBtn:hover": "{background-color:yellow;}"
    };
    
    var createDisplayClasses = function(){
        var hide = [], show = [], hideDefault = [], displayCss = [], displayCssSelector = [];
        var range;
        for(var i = 0; i<ranges.length; i++){
            range = ranges[i].name;
            hide.push( '.'+ range + ' .magic-hide-'+ range);
            show.push( '.'+ range + ' .magic-show-'+ range);
            hideDefault.push( '.magic-show-'+ range);
            displayCss.push( 'magic-hide-'+ range);
            displayCss.push( 'magic-show-'+ range);
            displayCssSelector.push( '.magic-hide-'+ range);
            displayCssSelector.push( '.magic-show-'+ range);
        }
        displayClassesSelector = displayCssSelector.join(',');
        displayClasses = displayCss.join(' ');
        return hide.join(',') + '{display:none;} '+
            hideDefault.join(',') + '{display:none;} '+
            show.join(',') + '{display:initial;}';
    };
    
    
    var setStyles = function(){
        var cssString = "";
        for (var selector in styles) {
            if( styles.hasOwnProperty( selector ) ) {
                cssString += selector + styles[selector];
            }
        }
        cssString += createDisplayClasses();
        head.append('<style type="text/css" class="resizeMagicStyles">'+ cssString +'</style>');
    }
    
    
    var detectDevice = function(){
        var ie = navigator.userAgent.indexOf('Trident/4.0')>0;
        console.log("Device: ");
        console.log("Browser: ");
    }
    
    
    
    
    var getCurrentRange = function(){
        var range;
        for(var i = 0; i<ranges.length; i++){
            range = ranges[i];
            if(range.query.matches) break; 
        } 
        if(currentRangeIndex != i){
            currentRangeIndex = i;
            currentRange = range;
            $(".resizeMagicBtn").removeClass("active");
            $(".resizeMagicBtn." + currentRange.name).addClass("active");
            html.removeClass( cssClasses ).addClass( currentRange.name );
            updateWatchers();
        }
    }
    
    
    var throwError = function( errorCode ){
        console.error( errors[ errorCode ] ); 
        return -1;
    }
    
    var initRanges = function(){
        var previousBottom = -1;
        var previousTop = -1;
        var bottom, top, range, lastRange;
        var query;
        for (var rangeName in modes) {
            if( modes.hasOwnProperty( rangeName ) ) {
                range = modes[rangeName];
                bottom = range[0];
                top = range[1];
                if(previousBottom < 0 && bottom != 0) {
                    return throwError(0);
                }
                if(previousBottom >= bottom || bottom >= top || bottom-1 != previousTop){
                    return throwError(1);
                }
                range = {
                    bottom: bottom,
                    top: top,
                    name: rangeName,
                    query: window.matchMedia('(min-width: '+ bottom +'px) and (max-width: '+ top +'px)'),
                    viewport: top
                };
                ranges.push(range);
                cssClasses += rangeName + ' ';
                previousBottom = bottom;
                previousTop = top;
                range.query.addListener(getCurrentRange);
       
            }
        }
        if(ranges.length < 2) return throwError(2);
        lastRange = ranges[ranges.length-1];
        lastRange.isLast = true;
        lastRange.top = INFINITY;
        lastRange.viewport = bottom;
        return 1;
    }
    
    var findMagicElements = function(){
        //construimos dinámicamente el selector que captura a todos los watchers
        var selector = [], attrName, fullAttrName, range, rangeSelector, group;
        for (var attrName in magicContent) {
            if( magicContent.hasOwnProperty( attrName ) ) {
                rangeSelector = [];
                for(var i = 0; i<ranges.length; i++){
                    range = ranges[i];
                    fullAttrName = '['+ attrName + '-' + range.name +']';
                    selector.push( fullAttrName );
                    rangeSelector.push( fullAttrName );
                }
                group = magicContent[attrName];
                if(rangeSelector.length){
                    group.selector = rangeSelector.join(',');
                    group.elements = body.find(group.selector);
                }
            }
        }
    }
    
                
    var fillWatcherValues = function( watcher ){
        var values = [], value, range;
        for(var i = 0; i<ranges.length; i++){
            range = ranges[i];
            value = watcher.element.attr(watcher.typeName + '-' + range.name);
            values.push( value || watcher.default );
        }
        watcher.values = values;
    }

    var fillWatcherHasAttr = function( watcher ){
        var classes = [], hasAttr, range, element, currentClass;
        for(var i = 0; i<ranges.length; i++){
            range = ranges[i];
            element = watcher.element.get(0);
            currentClass = watcher.typeName + '-' + range.name;
            hasAttr = element.hasAttribute(currentClass);
            if(hasAttr) watcher.element.addClass( currentClass );
        }
    }

    var initWatchers = function(){
        findMagicElements();
        var mc;
        for (var attrName in magicContent) {
            if( magicContent.hasOwnProperty( attrName ) ) {
                mc = magicContent[ attrName ];
                mc.elements.each(function(index){
                    var el = $(this);
                    var watcher = {
                        'type': mc,
                        'element': el,
                        'typeName': attrName,
                        'nodeType': el.prop('nodeName').toUpperCase()   
                    };
                    handlers[mc.init](watcher);
                    if(mc.update) watchers.push(watcher);
                });
            }
        }
    }
    
    var updateWatchers = function(){
        var w, update;
        for(var i=0; i<watchers.length; i++){
            w = watchers[i];
            update = w.type.update;
            if(update) handlers[update](w);
        }  
    };


    var initDebug = function(){
        if(options.debug){
            var btn, html ="", text, range, debugBar;
            for(var i = 0; i<ranges.length; i++){
                range =  ranges[i];
                text = range.name + ' [' + range.bottom + '-' + (range.isLast ? '∞' : range.top) + ']'; 
                btn = '<button data-range="'+ i +'" class="resizeMagicBtn '+   range.name +'">' + text + '</button>';
                html += btn;
            }     
            debugBar = $('<div class="resizeMagicDebug">');
            debugBar.append(html);
            body.append(debugBar);
            $(".resizeMagicBtn").click( onRangeButtonClick );
        }
    }

    var onRangeButtonClick = function(e){
        var url = window.location.href,
            btn = $(this),
            targetViewport = ranges[ btn.data('range')*1 ].viewport;
        window.open(url,'targetWindow',
                    'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width='+ 
                    targetViewport +',height=600');
    }
    
    
    
    //image watcher
    handlers.magicSrcInit = function( watcher ){
        watcher.default = watcher.element.attr("src");
        fillWatcherValues( watcher );
    }
    handlers.magicSrcUpdate = function( watcher ){
        watcher.element.attr("src", watcher.values[ currentRangeIndex ]);
    }
    //text watcher
    handlers.magicTextInit = function( watcher ){
        var valueNode = watcher.nodeType == "TEXTAREA" || watcher.nodeType == "INPUT";
        watcher.default = valueNode ? watcher.element.val() : watcher.element.html();
        fillWatcherValues( watcher );
    }
    handlers.magicTextUpdate = function( watcher ){
        var valueNode = watcher.nodeType == "TEXTAREA" || watcher.nodeType == "INPUT",
            value = watcher.values[ currentRangeIndex ];
        if(valueNode){
            watcher.element.val(value);
        }else{
            watcher.element.html(value);
        }        
    }
    //hide watcher
    handlers.magicHideInit = function( watcher ){
        fillWatcherHasAttr( watcher );
    }
    //show watcher
    handlers.magicShowInit = function( watcher ){
        fillWatcherHasAttr( watcher );
    }
    
    

    var stretch = function(){
        var width =  $(window).width() * 1,
            viewportWidth;
        if(screenWidth != width){
            screenWidth = width;
            viewportWidth  = currentRange.viewport;
            zoom = 100 * screenWidth / viewportWidth; 
            body.css("zoom", zoom + "%");
            $.zoom = zoom;
        }
    } 
    
    


    $.fn.removeMagic = function() {
        $(window).unbind('resize.' + SIGNATURE);
        for(var i = 0; i<ranges.length; i++){
            ranges[i].query.removeListener(getCurrentRange);
        } 
        watchers = ranges = [];
        $(".resizeMagicDebug").remove();
        $(".resizeMagicStyles").remove();
        $(displayClassesSelector).removeClass(displayClasses); 
        body.css("zoom", "100%");
        html.removeClass(cssClasses);

        //para optimizar, se podrian quitar los hide y show por codigo y hacerlos por estilos, asi al deshabilitar no interfiere, solo con una clase
    };


    $.fn.responsiveMagic = function( settings ) {
        var defaults = {
            debug: true		
        };

        options =  $.extend(defaults, settings);	

        if( !matchMedia ) return throwError(3);
        if( initRanges() > 0){
            setStyles();
            initDebug();
            initWatchers();
            getCurrentRange();  
            $(window).bind('resize.' + SIGNATURE, stretch);
            stretch();
        } 
    }


    
  
     
    // $(window).trigger('exitBreakpoint' + options.breakpoints[x]);
    
    //bind resize event, to update grips position 
    //$(window).bind('resize.'+SIGNATURE, onResize); 


})(jQuery);









