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



    * aplica zoom automáticamente y lo expone
        redimensiona el contenido del viewport
        posibilidad de agregar bordes (por resolucion)
        exponer al exterior la posicion del mouse
        posibilidad de multiples contenedores?




 data-fit-under = "420"
 data-fit-range ="420,580"  //tambien tiene que funcionar con []
 data-fit-ranges = "[420,580][581,700]"
 data-fit-over = "1200"
 data-fit-foundation = "small, large"


*/






(function($){

    var watchRanges = [];
    var viewport = null;
    var screenWidth = 0;
    var body = $('body');
    var head = $('head');
    var html = $('html');
    var wnd = $(window);
    var watchers = [];
    var handlers = {};
    var INFINITY = 999999;
    var SIGNATURE = "_letitfit";

    var errors = [
        "RANGE ERROR: first range must start with 0", // 0
        "RANGE ERROR: ranges malformation", // 1
        "RANGE ERROR: at least 2 ranges are needed in order to use this plugin", //2
        "MATCHMEDIA ERROR: your browser does not support matchMedia. Use a polyfill for further compatibility" //3
    ];



    var activeRanges = [];

    //this function gets fired everytime a mediaquery matches
    var onChangeRange = function(){
        var currentRanges = [], range, i, index;
        for(i = 0; i<watchRanges.length; i++){
            range = watchRanges[i];
            if(range.query.matches) currentRanges.push(range);
            if(!range.style) createStyle( range );
        }
        //previously active ranges can be out of scope
        for(i = 0; i<activeRanges.length; i++){
            range = activeRanges[i];
            index = $.inArray( range, currentRanges );
            if(index<0) onQuitRange(range);
        }
        activeRanges = currentRanges;
        console.log("-MatchMedia-" )
        console.log(activeRanges);
    }


    var createStyle = function(range){
        var str = '<style id="' + range.id + '"> </style>';
        head.append(str);
        range.style = $("#"+range.id);
        range.element.addClass(range.id);
    }

    var onQuitRange = function(range){
        range.style.remove();
        range.style = null;
        range.element.removeClass(range.id);
    }



    var stretch = function(){
        var width =  $(window).width() * 1,
            viewportWidth, range, zoom;
        if(screenWidth != width){
            screenWidth = width;
            var dummy = $('<div/>');
            for(var i = 0; i<activeRanges.length; i++){
                range = activeRanges[i];
                viewportWidth  = range.viewport;
                zoom = screenWidth / viewportWidth;
                dummy.css("transform","scale("+ zoom +","+ zoom +")").css("transform-origin","0 0 0");
                dummy.css("width", range.viewport).css("position","absolute");
                range.style.html('.'+range.id+'{'+ dummy.attr("style")+"}");
            }
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
    };


    $.fn.responsiveMagic = function( settings ) {
        var defaults = {
            debug: true //TO-DO false o true por defecto?
        };

        options =  $.extend(defaults, settings);
        if( !matchMedia ) return throwError(3);
    }





    // $(window).trigger('exitBreakpoint' + options.breakpoints[x]);

    //bind resize event, to update grips position
    //$(window).bind('resize.'+SIGNATURE, onResize);


    var tags = {
        under: "under",
        over: "over",
        range: "range",
        ranges: "ranges",
        foundation: "foundation"
    };

    var foundation ={
        small: [0,500],
        medium: [501, 700],
        large: [701, 99999]
    };

    var parseFoundationRanges = function(str){
        return [];
    }

    var watch = function(element, range, viewport){
        range = {
            id: generateRangeId()+SIGNATURE,
            element: element,
            bottom: range[0],
            top: range[1],
            query: null,
            viewport: viewport,
            stle: null
        };
        range.query = window.matchMedia('(min-width: '+ range.bottom +'px) and (max-width: '+ range.top +'px)');
        watchRanges.push(range);
        range.query.addListener(onChangeRange);
    }



    var generateRangeId = function(){
        if(!generateRangeId.nextId){
            generateRangeId.nextId = 1;
        }
        return "range_" + generateRangeId.nextId++;
    }


    var parseRange = function(str){
        str = str.toString();
        var r = str.split(",");
        if(r.length<2) r = str.split(";");
        if(r.length<2) r = str.split(" ");
        if(r.length<2) r = str.split("-");
        r[0]*=1;r[1]*=1;
        return r;
    }

    var parseRanges = function(str){
//AQUI VOUUUU_y
    }

    var init = function(){
        var matching = null,
            attr = '',
            value,
            range,
            ranges,
            viewport;
        $.each(tags, function(tag, tagstr) {
            if(tags.hasOwnProperty(tag)){
                matching = $('[data-fit-'+ tagstr +']');
                attr = 'fit-'+tagstr;
                matching.each(function(i,el){
                    el = $(el);
                    value = el.data(attr);
                    range = [0, INFINITY];
                    ranges = null;
                    viewport = null;
                    switch(tag){
                        case tags.under:
                            viewport = range[1] = value*1;
                            break;
                        case tags.over:
                            viewport = range[0] = value*1;
                            break;
                        case tags.range:
                            range = parseRange(value);
                            viewport = range[1];
                            break;
                        case tags.ranges:
                            ranges = parseRanges(value);
                            break;
                        case tags.foundation:
                            ranges = parseFoundationRanges(value);
                            break;
                    }
                    if(ranges === null){
                        //one single range
                        console.log("sencillo");
                        watch(el, range, viewport);
                    }else{
                        //multiple ranges for one single tag
                        console.log("multiples");
                    }
                });
            }
        });





        $(window).bind('resize.' + SIGNATURE, stretch);
        stretch();

    }

    init();

})(jQuery);











