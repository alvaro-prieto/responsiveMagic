/**
     _      _   _ _    __ _ _
    | |    | | (_) |  / _(_) |
    | | ___| |_ _| |_| |_ _| |_
    | |/ _ \ __| | __|  _| | __|
    | |  __/ |_| | |_| | | | |_
    |_|\___|\__|_|\__|_| |_|\__|

    v1.0 - jQuery plugin created by Alvaro Prieto Lauroba.

    License: * free for personal use,
             * $1 for commercial usages and brands (lifetime license)
             * Any donation is extremely appreciated, I don't earn much money  :-)

*/


(function($){

    //const
    var INFINITY = 999999,
        SIGNATURE = "_letitfit",
        PX = "px",
        EM = "em";

    //variables
    var activeRanges = [],  //ranges currently matching a media query
        watchRanges = [],   //all defined ranges
        screenWidth = 0;    //last screen size

    //shortcuts
    var head = $('head'),
        body = $('body'),
        wnd = $(window);

    //accepted data-tags
    var tags = {
        under: "under",
        over: "over",
        range: "range",
        ranges: "ranges",
        foundation: "foundation",
        bootstrap: "bootstrap"
    };

    //sensitivity to height changes
    var sensitivity = {
        normal: 1,
        medium: 2,
        high: 3
    }

    //stardard foundation ranges
    var foundation = {
        small: '[0em,40em]',
        medium: '[40.063em,64em]',
        large: '[64.063em,inf]'
    };

    //standard bootstrap ranges
    var bootstrap = {
        xs:'[0,543]',
        sm:'[544,767]',
        md:'[768,991]',
        lg:'[992,1199]',
        xl:'[1200,inf]'
    }


    //this function gets fired everytime a mediaquery matches
    var onChangeRange = function(){
        var currentRanges = [], range, i, index;
        for(i = 0; i<watchRanges.length; i++){
            range = watchRanges[i];
            if(range.query.matches){
                currentRanges.push(range);
                if(!range.active) onEnterRange( range );
            }else if(range.active){
                onQuitRange(range);
            }
        }
        activeRanges = currentRanges;
    }

    var onEnterRange = function(range){
        var str = '<style id="' + range.id + '"> </style>';
        head.append(str);
        range.style = $("#"+range.id);
        range.element.addClass(range.id);
        range.element.wrap('<div/>');
        range.wrapper = range.element.parent();
        range.active = true;
        if(range.sensitivity == sensitivity.medium)
            range.mutationObserver.observe(range.element.get(0), {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            });
        updateRangeAspectRatio(range);
    }

    var onQuitRange = function(range){
        range.style.remove();
        range.element.unwrap();
        range.style = null;
        range.wrapper = null;
        range.element.removeClass(range.id);
        range.active = false;
        if(range.sensitivity == sensitivity.medium)
            range.mutationObserver.disconnect();
    }

    var onRangeMutation = function(range){
        if(range.active){
            updateRangeAspectRatio(range);
            fitRange(range);
        }
    }

    var updateRangeAspectRatio = function(range){
        range.aspectRatio = range.element.height() / range.width;
    }


    var fitRange = function(range){
        var zoom,
            dummy = $('<div/>');

        zoom = screenWidth / range.width;
        dummy.css("transform","scale("+ zoom +","+ zoom +")").css("transform-origin","0 0 0");
        dummy.css("width", range.width).css("position","absolute");
        range.style.html('.'+range.id+'{'+ dummy.attr("style")+"}");
        range.wrapper.css("height", range.aspectRatio * range.width * zoom );
    }


    var stretch = function(){
        var width =  $(window).width() * 1;
        if(screenWidth != width ){
            screenWidth = width;
            for(var i = 0; i<activeRanges.length; i++){
                fitRange( activeRanges[i] );
            }
        }
    }


    //=========================

    $.fn.removeMagic = function() {
        $(window).unbind('resize.' + SIGNATURE);
        for(var i = 0; i<ranges.length; i++){
            ranges[i].query.removeListener(getCurrentRange);
        }
        watchers = ranges = [];
        $(".resizeMagicDebug").remove();
        $(".resizeMagicStyles").remove();
        $(displayClassesSelector).removeClass(displayClasses);
        //html.removeClass(cssClasses);
    };

    $.fn.responsiveMagic = function( settings ) {
        var defaults = {
            debug: true //TO-DO false o true por defecto?
        };

        options =  $.extend(defaults, settings);

    }
    // $(window).trigger('exitBreakpoint' + options.breakpoints[x]);

    //bind resize event, to update grips position
    //$(window).bind('resize.'+SIGNATURE, onResize);

    //=========================


    //         <meta name="viewport" content="width=device-width, initial-scale=1.0" />





    var watch = function(element, range, viewport){
        range = {
            id: generateRangeId()+SIGNATURE,
            active:false,
            element: element,
            bottom: range[0],
            top: range[1],
            query: null,
            viewport: viewport,
            style: null,
            wrapper: null,
            width: range.units == PX ? viewport : emToPx(viewport),
            aspectRatio: 0,
            units: range.units,
            mutationObserver: null,
            heightObserver: null,
            sensitivity: sensitivity.normal
        };
        range.query = window.matchMedia('(min-width: '+ range.bottom + range.units +') and (max-width: '+ range.top + range.units + ')');
        parseSensibility(range);
        createContentMutationObsever(range);
        watchRanges.push(range);
        range.query.addListener(onChangeRange);
    }


    var createContentMutationObsever = function(range){
        //until ResizeObserver is implemented for modern browsers this is the way to go
        if(range.sensitivity < sensitivity.high){
            range.element.find("img").load( function(){ onRangeMutation(range) });
        }
        if(range.sensitivity == sensitivity.medium){
            range.mutationObserver = new MutationObserver( function(){ onRangeMutation(range) });
        }
        if(range.sensitivity == sensitivity.high){
            range.heightObserver = function(){
                if(range.active){
                    var ar = range.element.height() / range.width;
                    if(ar != range.aspectRatio){
                        range.aspectRatio = ar;
                        fitRange(range);
                    }
                }
                requestAnimationFrame(range.heightObserver);
            }
            range.heightObserver();
        }

    }


    var emToPx = function(em) {
        var font_base = parseFloat(body.css("font-size"));
        return parseInt(em * font_base);
    };


    var generateRangeId = function(){
        if(!generateRangeId.nextId){
            generateRangeId.nextId = 1;
        }
        return "range_" + generateRangeId.nextId++;
    }

    var parseSensibility = function(range){
        var data = range.element.data("fit-sensitivity");
        if(data){
            data = $.trim(data.toString().toLowerCase());
            switch(data){
                case "medium" : range.sensitivity = sensitivity.medium; break;
                case "high" : range.sensitivity = sensitivity.high; break;
            }
        }
    }

    var parseRange = function(str){
        var range = [];
        str = cleanUnits(str, range);
        str = str.replace(/\;|\ |\-/g,',');
        var r = str.split(",");
        r[1] = r[1].toLowerCase().indexOf("inf") <0 ? r[1] : INFINITY;
        r[0] *= 1; r[1] *= 1;
        r[0] = r[0] > 2000 ? INFINITY : r[0];
        r[1] = r[1] > 2000 ? INFINITY : r[1];
        range[0] = Math.min(r[0], r[1]);
        range[1] = Math.max(r[0], r[1]);
        return range;
    }

    var parseRanges = function(str){
        var ranges = [], range, aux;
        str = str.toString().replace(/\]\,\[/g,'][');
        aux = str.split("][");
        for(var i =0; i<aux.length; i++){
            range = $.trim(aux[i].toString().replace(/\[|\]|\,/g,' '));
            range = parseRange(range);
            ranges.push(range);
        }
        return ranges;
    }

    var parseFrameworkRanges = function(str, framework){
        str = str.replace(/\ |\[|\]/g,'').toLowerCase();
        var names = str.split(','),
            ranges = [],
            value;
        for(var i=0; i<names.length; i++){
            value = framework[names[i]];
            if(value) ranges.push(value);
        }
        return parseRanges( ranges.join() );
    }

    var cleanUnits = function(value, range){
        range.units = PX;  //default;
        value = value.toString();
        value = value.replace(/px/g,'');
        if(value.indexOf(EM)>=0){
            range.units = EM;
            value = value.replace(/em/g,'');
        }
        return value;
    }

    var init = function(){
        if( typeof matchMedia == 'undefined'){
            console.warn('MATCHMEDIA ERROR: your browser does not support matchMedia. Use a polyfill for further compatibility');
            return;
        }
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
                            viewport = range[1] = cleanUnits(value, range)*1;
                            break;
                        case tags.over:
                            viewport = range[0] = cleanUnits(value, range)*1;
                            break;
                        case tags.range:
                            range = parseRange(value);
                            viewport = range[1];
                            break;
                        case tags.ranges:
                            ranges = parseRanges(value);
                            break;
                        case tags.foundation:
                            ranges = parseFrameworkRanges(value, foundation);
                            break;
                        case tags.bootstrap:
                            ranges = parseFrameworkRanges(value, bootstrap);
                            break;
                    }
                    if(ranges === null){
                        //one single range
                        watch(el, range, viewport);
                    }else{
                        //multiple ranges for one single tag
                        for(var i = 0; i<ranges.length; i++){
                            range = ranges[i];
                            viewport = range[1] == INFINITY ? range[0] : range[1];
                            watch(el, range, viewport);
                        }
                    }
                });
            }
        });

        $(window).bind('resize.' + SIGNATURE, stretch);
        onChangeRange();
        stretch();
    }

    $(function(){
       init();
    });

})(jQuery);











