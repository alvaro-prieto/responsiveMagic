/**
     _      _   _ _    __ _ _
    | |    | | (_) |  / _(_) |
    | | ___| |_ _| |_| |_ _| |_
    | |/ _ \ __| | __|  _| | __|
    | |  __/ |_| | |_| | | | |_
    |_|\___|\__|_|\__|_| |_|\__|

    v1.3 - jQuery plugin created by Alvaro Prieto Lauroba.

    LICENSE:

    - free  for personal use in non-profit websites
    - $5    for commercial usages and brands. One single website license
    - $10   for commercial purpose and brands. Use it in as many websites as you want (lifetime license)
    - $15   for embedding. Use it in a redistributable package such as website templates, mobile apps, etc..

    - Any donation is extremely appreciated, I don't earn much money  :-)

*/


(function($){

    //check if jQuery is available
    if(!$) return setTimeout(function(){ alert("jQuery is required to use Letitfit"); }, MAX);

    //const
    var INFINITE = 999999,
        MAX = 2000,
        SIGNATURE = "-letitfit",
        PX = "px",
        EM = "em",
        FIT = "fit-",
        META = '<meta id="meta_letitfit" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />';


    //variables
    var activeRangeWatchers = [],  //ranges currently matching a media query
        rangeWatchers = [], //all defined range watchers
        emWatchers = [],    //all defined em watchers
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
        target: "target",
        smoothing: "smoothing",
        foundation: "foundation",
        bootstrap: "bootstrap",
        partial: "partial",
        sensitivity: "sensitivity",
        em: "em"
    };

    //sensitivity to height changes
    var sensitivity = {
        normal: 1,
        medium: 2,
        high: 3
    }

    //smoothing values
    var smoothing = {
        smooth: 1,
        sharp: 2
    }

    //resize modes
    var mode = {
        scale: 1,
        em: 2
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
        var currentRangeWatchers = [], watcher, i, index;
        for(i = 0; i<rangeWatchers.length; i++){
            watcher = rangeWatchers[i];
            if(watcher.query.matches){
                currentRangeWatchers.push(watcher);
                if(!watcher.active) onEnterRange( watcher );
            }else if(watcher.active){
                onQuitRange(watcher);
            }
        }
        activeRangeWatchers = currentRangeWatchers;
    }

    //create a style tag linked to the watcher
    var createStyle = function(watcher){
        var str = '<style id="' + watcher.id + '"> </style>';
        head.append(str);
        watcher.style = $("#"+watcher.id);
        watcher.element.addClass(watcher.id);
    }

    //this function gets fired when a watcher enter in its viewport range
    var onEnterRange = function(watcher){
        var parentId = watcher.element.attr("id") || false;
        createStyle(watcher);
        if(!watcher.global){
            watcher.element.wrap( parentId ? '<div id="'+ parentId + SIGNATURE +'"/>' : '<div/>');
            watcher.wrapper = watcher.element.parent();
            if(watcher.sensitivity == sensitivity.medium)
                watcher.mutationObserver.observe(watcher.element.get(0), {
                    attributes: true,
                    childList: true,
                    characterData: true,
                    subtree: true
                });
        }
        watcher.active = true;
        updateAspectRatio(watcher);
    }

    //this function gets fired when a watcher leaves its viewport range
    var onQuitRange = function(watcher){
        watcher.style.remove();
        watcher.style = null;
        watcher.element.removeClass(watcher.id);
        watcher.active = false;
        if(!watcher.global){
            watcher.element.unwrap();
            watcher.wrapper = null;
            if(watcher.sensitivity == sensitivity.medium)
                watcher.mutationObserver.disconnect();
        }
    }

    //when the content of a range is altered, its aspect ratio has to be updated
    var onRangeMutation = function(watcher){
        if(watcher.active){
            updateAspectRatio(watcher);
            fitRange(watcher);
        }
    }

    //update aspect ratio
    var updateAspectRatio = function(watcher){
        watcher.aspectRatio = watcher.element.height() / watcher.width;
    }

    //this function stretch a range to the viewport width
    var fitRange = function(watcher){
        var zoom,
            dummy = $('<div/>'),
            smooth = watcher.smoothing == smoothing.smooth ? 'perspective(1px) ' : '';

        zoom = screenWidth / watcher.width;
        dummy.css("transform", smooth + "scale("+ zoom +","+ zoom +")").css("transform-origin","0 0 0");
        dummy.css("width", watcher.width * watcher.partial).css({"position":"absolute", "overflow-x":"hidden"});
        watcher.style.html('.'+watcher.id+'{'+ dummy.attr("style")+"}");
        if(!watcher.global){
            updateAspectRatio(watcher);
            watcher.wrapper.css("height", watcher.aspectRatio * watcher.width * zoom );
        }
    }

    //this function is called whenever the browser is resized and it aims to adjust
    //the EM value to fit the entire width (in EM mode)
    var fitEm = function(watcher){
        var dummy = $('<div/>');
        dummy.css({
            "font-size": screenWidth / watcher.target
        });
        watcher.style.html('.'+watcher.id+'{'+ dummy.attr("style")+"}" +
                           '.'+watcher.id+ " *{max-width:100%;}");
    }

    //event handler for window resize
    var onWindowResize = function(){
        var width = wnd.width() * 1, i;
        if(screenWidth != width ){
            screenWidth = width;
            for(i = 0; i<activeRangeWatchers.length; i++){
                fitRange( activeRangeWatchers[i] );
            }
            for(i = 0; i<emWatchers.length; i++){
                fitEm( emWatchers[i] );
            }
        }
    }

    //according the range's sensitivity factor, mutation content is implemented in different ways
    //until ResizeObserver is implemented for modern browsers this is the way to go...
    var createContentMutationObsever = function(watcher){
        if(watcher.sensitivity < sensitivity.high){
            watcher.element.find("img").load( function(){ onRangeMutation(watcher) });
        }
        if(watcher.sensitivity == sensitivity.medium){
            watcher.mutationObserver = new MutationObserver( function(){ onRangeMutation(watcher) });
        }
        if(watcher.sensitivity == sensitivity.high){
            watcher.heightObserver = function(){
                if(watcher.active){
                    var ar = watcher.element.height() / watcher.width;
                    if(ar != watcher.aspectRatio){
                        watcher.aspectRatio = ar;
                        fitRange(watcher);
                    }
                }
                requestAnimationFrame(watcher.heightObserver);
            }
            watcher.heightObserver();
        }
    }

    //convert em units to px
    var emToPx = function(em) {
        var font_base = parseFloat(body.css("font-size"));
        return parseInt(em * font_base);
    };

    //generate unique ids for each range
    var generateWatcherId = function(){
        if(!generateWatcherId.nextId){
            generateWatcherId.nextId = 1;
        }
        return FIT + generateWatcherId.nextId++;
    }

    //parse watcher sensibility data-tag
    var parseSensibility = function(watcher){
        var data = watcher.element.data( FIT + tags.sensitivity );
        if(data){
            data = $.trim(data.toString().toLowerCase());
            data = sensitivity[data];
            if(data) watcher.sensitivity = data;
        }
    }

    //parse watcher smoothing data-tag
    var parseSmoothing = function(watcher){
        var data = watcher.element.data( FIT + tags.smoothing );
        if(data){
            data = $.trim(data.toString().toLowerCase());
            data = smoothing[data];
            if(data) watcher.smoothing = data;
        }else if( watcher.bottom === 0 && watcher.top == INFINITE) {
            //default value for data-fit-target is sharp
            watcher.smoothing = smoothing.sharp;
        }
    }

    //parse element proportion if it is not full width (allowed values without units, px or %)
    var parsePartial = function(watcher){
        var value = watcher.element.data( FIT + tags.partial ),
            percentage = 0;
        if(value){
            value = value.toString().toLowerCase();
            value = value.replace(/px/g,'');
            if(value.indexOf("%")>=0){
                value = value.replace(/%/g,'');
                percentage = true;
            }
            value = parseFloat(value);
            if(!isNaN(value)){
                percentage = percentage ?  value/100 : value/watcher.width;
                if(percentage>0 && percentage<100) watcher.partial = percentage;
            }
        }
    }

    //remove units from a watcher range (em, px), and store it as watcher.units
    var cleanUnits = function(value, watcher){
        watcher.units = PX;  //default;
        value = value.toString().toLowerCase();
        value = value.replace(/px/g,'');
        if(value.indexOf(EM)>=0){
            watcher.units = EM;
            value = value.replace(/em/g,'');
        }
        return value;
    }

    //parse one single range, examples: [100,500]; 100,infinite; [30em-40em]; 100,500,400 ...
    //it can contain an extra digit for the target viewport [a,b,c]
    var parseRange = function(str, length){
        var range = [], target, r, i, dim;
        str = cleanUnits(str, range);
        str = str.replace(/\;|\ |\-/g,',');
        r = str.split(",");
        dim = Math.min(r.length, length+1);
        for(i=0; i<dim; i++){
            r[i] = (r[i].indexOf("inf") <0 ? r[i] : INFINITE) * 1;
            r[i] = r[i] > MAX ? INFINITE : r[i];
            if(i<length){
                range.push(r[i])
            }else{
                range.target = r[i];
            }
        }
        if(length==2){
            range[0] = Math.min(r[0], r[1]);
            range[1] = Math.max(r[0], r[1]);
        }
        return range;
    }

    //parse a compound range, example: [100,500][501px,800px];[801,900]
    var parseRanges = function(str){
        var ranges = [], range, aux;
        str = str.toString().replace(/(\]\,\[)|(\]\ \[)|(\]\;\[)/g,'][');
        aux = str.split("][");
        for(var i =0; i<aux.length; i++){
            range = $.trim(aux[i].toString().replace(/\[|\]|\,/g,' '));
            range = parseRange(range, 2);
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


    //this function creates range watchers
    var createRangeWatcher = function(element, range, viewport){
        var watcher = {
            id: generateWatcherId()+SIGNATURE,            //unique range ID
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
            partial: 1,         //when element is not 100% width, specifies its size/proportion
                                //in comparison with the target width (0 to 1)
            units: range.units, //units: px / em
            mutationObserver: null,         //DOM manipulation observer. It is important to check for height changes
            heightObserver: null,           //daemon for height checking when sensibility is set to high
            sensitivity: sensitivity.normal, //used to specify how much resources spend to look for height-changes
            smoothing: smoothing.smooth    //different algorithms for rendering scaled text

        };
        watcher.query = window.matchMedia('(min-width: '+ watcher.bottom + watcher.units +') and (max-width: '+
                                          watcher.top + watcher.units + ')');
        if(!watcher.global){
            parseSensibility(watcher);
            createContentMutationObsever(watcher);
        }
        parseSmoothing(watcher);
        parsePartial(watcher);
        rangeWatchers.push(watcher);
        watcher.query.addListener(onChangeRange);
    }


    //this function creates em watchers
    var createEmWatcher = function(element, target){
        var watcher = {
                id: generateWatcherId()+SIGNATURE,    //unique range ID
                element: element,   //DOM element in which EM units should be scaled according to the browser width
                style: null,        //watcher's associated <style> DOM element
                target: target      //target value to fill the entire width (100 by default)
            };

        createStyle(watcher);
        emWatchers.push(watcher);
    }


    //Init the plugin. Look for supported data-fit elements to create their corresponding watchers
    var init = function(){
        if( typeof matchMedia == 'undefined'){
            console.warn("MATCHMEDIA ERROR: your browser doesn't support matchMedia. Use a polyfill for further compatibility");
            return;
        }
        var matching = null,
            attr = '',
            resizeMode = mode.scale,
            value,
            range,
            ranges,
            viewport,
            r;


        $.each(tags, function(tag, tagstr) {
            if(tags.hasOwnProperty(tag)){
                matching = $('[data-'+ FIT + tagstr +']');
                attr = FIT + tagstr;
                matching.each(function(i,el){
                    el = $(el);
                    value = el.data(attr);
                    range = [0, INFINITE];
                    ranges = null;
                    viewport = null;
                    switch(tag){
                        case tags.em:
                            r = parseRange(value, 1);
                            viewport = r[0] || 100;
                            resizeMode = mode.em;
                            break;
                        case tags.under:
                            r = parseRange(value, 1);
                            range[1] = r[0];
                            viewport = r.target || r[0];
                            break;
                        case tags.over:
                            r = parseRange(value, 1);
                            range[0] = r[0];
                            viewport = r.target || r[0];
                            break;
                        case tags.range:
                            r = range = parseRange(value, 2);
                            viewport = range.target || range[1];
                            break;
                        case tags.ranges:
                            ranges = parseRanges(value);
                            break;
                        case tags.target:
                            r = parseRange(value, 1);
                            viewport = r[0];
                            break;
                        case tags.foundation:
                            ranges = parseFrameworkRanges(value, foundation);
                            break;
                        case tags.bootstrap:
                            ranges = parseFrameworkRanges(value, bootstrap);
                            break;
                        default:
                            //data-modifiers are not real ranges
                            return false;
                    }


                    switch(resizeMode){

                        //Em mode
                        case mode.em:
                            createEmWatcher(el, viewport);
                            break;


                        //Scale mode (standard)
                        case mode.scale:
                            if(ranges === null){
                                //one single range
                                range.units = r.units;
                                createRangeWatcher(el, range, viewport);
                            }else{
                                //multiple ranges for one single tag
                                for(var i = 0; i<ranges.length; i++){
                                    range = ranges[i];
                                    viewport = range.target ? range.target :
                                    range[1] == INFINITE ? range[0] :
                                    range[1];
                                    createRangeWatcher(el, range, viewport);
                                }
                            }
                            break;
                    }

                });
            }
        });

        if(rangeWatchers.length || emWatchers.length){
            head.prepend(META);
            wnd.bind('resize.' + SIGNATURE, onWindowResize);
            if(rangeWatchers.length) onChangeRange();
            onWindowResize();
        }

    }

    //when document is loaded, automatically launch the plugin
    $(function(){ init(); });


})(typeof jQuery == 'undefined' ? null : jQuery);




/** TO-DO:
 *
 * soporta multiples instancias?
 *
 */

