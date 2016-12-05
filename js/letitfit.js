/**
     _      _   _ _    __ _ _
    | |    | | (_) |  / _(_) |
    | | ___| |_ _| |_| |_ _| |_
    | |/ _ \ __| | __|  _| | __|
    | |  __/ |_| | |_| | | | |_
    |_|\___|\__|_|\__|_| |_|\__|

    v1.0 - jQuery plugin created by Alvaro Prieto Lauroba.


    Licenses:   * free for personal use in non-profit websites
                * $3 for commercial usages and brands (one single site license)
                * $5 for developers, you will be able to use it in as many sites as you want (lifetime license)
                * $10 if you want to include it in a redistributable package, such as templates, mobile apps, etc..
                * Any donation is extremely appreciated, I don't earn much money  :-)

*/


(function($){

    //check if jQuery is available
    if(!$) return setTimeout(function(){ alert("include jQuery if you want to use Let·it·fit"); }, 1000);

    //const
    var INFINITE = 999999,
        SIGNATURE = "_letitfit",
        PX = "px",
        EM = "em",
        META = '<meta id="meta_letitfit" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />';


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


    //this function gets fired everytime a mediaquery matches (enter/exit range)
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

    //this function gets fired when a watcher enter in its viewport range
    var onEnterRange = function(range){
        var str = '<style id="' + range.id + '"> </style>';
        head.append(str);
        range.style = $("#"+range.id);
        range.element.addClass(range.id);
        if(!range.global){
            range.element.wrap('<div/>');
            range.wrapper = range.element.parent();
            if(range.sensitivity == sensitivity.medium)
                range.mutationObserver.observe(range.element.get(0), {
                    attributes: true,
                    childList: true,
                    characterData: true,
                    subtree: true
                });
        }
        range.active = true;
        updateRangeAspectRatio(range);
    }

    //this function gets fired when a watcher leaves its viewport range
    var onQuitRange = function(range){
        range.style.remove();
        range.style = null;
        range.element.removeClass(range.id);
        range.active = false;
        if(!range.global){
            range.element.unwrap();
            range.wrapper = null;
            if(range.sensitivity == sensitivity.medium)
                range.mutationObserver.disconnect();
        }
    }

    //when the content of a range is altered, its aspect ratio has to be updated
    var onRangeMutation = function(range){
        if(range.active){
            updateRangeAspectRatio(range);
            fitRange(range);
        }
    }

    //update aspect ratio
    var updateRangeAspectRatio = function(range){
        range.aspectRatio = range.element.height() / range.width;
    }

    //this function stretch a range to the viewport width
    var fitRange = function(range){
        var zoom,
            dummy = $('<div/>');

        zoom = screenWidth / range.width;
        dummy.css("transform","scale("+ zoom +","+ zoom +")").css("transform-origin","0 0 0");
        dummy.css("width", range.width).css("position","absolute");
        range.style.html('.'+range.id+'{'+ dummy.attr("style")+"}");
        if(!range.global)
            range.wrapper.css("height", range.aspectRatio * range.width * zoom );
    }

    //event handler for window resize
    var onWindowResize = function(){
        var width = $(window).width() * 1;
        if(screenWidth != width ){
            screenWidth = width;
            for(var i = 0; i<activeRanges.length; i++){
                fitRange( activeRanges[i] );
            }
        }
    }

    //according the range's sensitivity factor, mutation content is implemented in different ways
    //until ResizeObserver is implemented for modern browsers this is the way to go...
    var createContentMutationObsever = function(range){
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

    //convert em units to px
    var emToPx = function(em) {
        var font_base = parseFloat(body.css("font-size"));
        return parseInt(em * font_base);
    };

    //generate unique ids for each range
    var generateRangeId = function(){
        if(!generateRangeId.nextId){
            generateRangeId.nextId = 1;
        }
        return "range_" + generateRangeId.nextId++;
    }

    //parse range sensibility data-tag
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

    //parse one single range, examples: [100,500]; 100,infinite; [30em-40em] ...
    var parseRange = function(str){
        var range = [];
        str = cleanUnits(str, range);
        str = str.replace(/\;|\ |\-/g,',');
        var r = str.split(",");
        r[1] = r[1].toLowerCase().indexOf("inf") <0 ? r[1] : INFINITE;
        r[0] *= 1; r[1] *= 1;
        r[0] = r[0] > 2000 ? INFINITE : r[0];
        r[1] = r[1] > 2000 ? INFINITE : r[1];
        range[0] = Math.min(r[0], r[1]);
        range[1] = Math.max(r[0], r[1]);
        return range;
    }

    //parse a compound range, example: [100,500][501px,800px];[801,900]
    var parseRanges = function(str){
        var ranges = [], range, aux;
        str = str.toString().replace(/(\]\,\[)|(\]\ \[)|(\]\;\[)/g,'][');
        aux = str.split("][");
        for(var i =0; i<aux.length; i++){
            range = $.trim(aux[i].toString().replace(/\[|\]|\,/g,' '));
            range = parseRange(range);
            ranges.push(range);
        }
        return ranges;
    }

    //parse custom framework ranges, example (foundation): [small,medium]
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

    //remove units from a range (em, px), and store it as range.units
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


    //this function creates range watchers
    var createWatcher = function(element, range, viewport){
        range = {
            id: generateRangeId()+SIGNATURE,            //unique range ID
            global: element.prop('tagName') == 'BODY',  //is the range element the <body> tag?
            width: range.units == PX ? viewport : emToPx(viewport), //target width in pixels of the current range
            active:false,       //is range's viewport matching the current resolution?
            element: element,   //DOM element which has to be stretched to fit
            bottom: range[0],   //media query bottom
            top: range[1],      //media query top
            query: null,        //matchMedia query
            style: null,        //range's associated <style> DOM element
            wrapper: null,      //placeholder wrapper (CSS transform do not alter page flow)
            aspectRatio: 0,     //block's aspect ratio
            units: range.units, //units: px / em
            mutationObserver: null,         //DOM manipulation observer. It is important to check for height changes
            heightObserver: null,           //daemon for height checking when sensibility is set to high
            sensitivity: sensitivity.normal //used to specify how much resources spend to look for height-changes
        };
        range.query = window.matchMedia('(min-width: '+ range.bottom + range.units +') and (max-width: '+ range.top + range.units + ')');
        if(!range.global){
            parseSensibility(range);
            createContentMutationObsever(range);
        }
        watchRanges.push(range);
        range.query.addListener(onChangeRange);
    }


    //Init the plugin. Look for supported data-fit elements to create their corresponding watchers
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
                    range = [0, INFINITE];
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
                        createWatcher(el, range, viewport);
                    }else{
                        //multiple ranges for one single tag
                        for(var i = 0; i<ranges.length; i++){
                            range = ranges[i];
                            viewport = range[1] == INFINITE ? range[0] : range[1];
                            createWatcher(el, range, viewport);
                        }
                    }
                });
            }
        });

        if(watchRanges.length != 0){
            head.prepend(META);
            $(window).bind('resize.' + SIGNATURE, onWindowResize);
            onChangeRange();
            onWindowResize();
        }

    }

    //when document is loaded, automatically launch the plugin
    $(function(){ init(); });


})(typeof jQuery == 'undefined' ? null : jQuery);





/* TODO:
 *
 *  + que pasa si queremos un unico rango ? (se elijen bien el bottom y el top? donde se establece la referencia target?)
 *  + posibiliad de destruir?
 *
 */






