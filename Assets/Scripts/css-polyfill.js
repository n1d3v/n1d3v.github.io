/*
 * This acts as a fix for some CSS attributes for Internet Explorer.
 * This allows for my site to be better viewed on older browsers!
 */

(function () {
    "use strict";

    function supportsFlexGap() {
        var probe = document.createElement("div");
        probe.style.display = "flex";
        probe.style.flexDirection = "column";

        probe.style.rowGap = "1px";

        probe.style.position = "absolute";
        probe.style.visibility = "hidden";

        probe.appendChild(document.createElement("div"));
        probe.appendChild(document.createElement("div"));

        probe.firstChild.style.height = "1px";
        probe.lastChild.style.height = "1px";

        document.body.appendChild(probe);
        var supported = probe.scrollHeight === 3;

        document.body.removeChild(probe);
        return supported;
    }

    function styleOf(element) {
        return element.currentStyle || window.getComputedStyle(element);
    }

    function parseBlocks(css, results) {
        var index = 0, length = css.length, prelude = "";

        while (index < length) {
            var character = css.charAt(index);
            if (character !== "{") {
                prelude += character;
                index++;
                continue;
            }

            var depth = 1, end = index + 1;
            while (end < length && depth > 0) {
                var innerCharacter = css.charAt(end);
                if (innerCharacter === "{") depth++;
                else if (innerCharacter === "}" && --depth === 0) break;
                end++;
            }

            var body = css.slice(index + 1, end);
            var header = prelude.replace(/^\s+|\s+$/g, "");

            if (header.charAt(0) === "@") {
                if (/^@media/i.test(header)) {
                    var condition = header.replace(/^@media/i, "").replace(/^\s+|\s+$/g, "");
                    var matches = true;
                    try {
                        if (window.matchMedia) matches = window.matchMedia(condition).matches;
                    } catch (error) {}
                    if (matches) parseBlocks(body, results);
                }
            } else if (header) {
                results.push({ selector: header, declarations: body });
            }

            prelude = "";
            index = end + 1;
        }
        return results;
    }

    function readGap(declarations) {
        var rowGap = null, columnGap = null;
        var pattern = /(?:^|;)\s*(gap|row-gap|column-gap)\s*:\s*([^;}]+)/gi;
        var match;

        while ((match = pattern.exec(declarations))) {
            var property = match[1].toLowerCase();
            var value = match[2].replace(/^\s+|\s+$/g, "");
            if (property === "gap") {
                var parts = value.split(/\s+/);
                rowGap = parts[0];
                columnGap = parts.length > 1 ? parts[1] : parts[0];
            } else if (property === "row-gap") {
                rowGap = value;
            } else {
                columnGap = value;
            }
        }

        if (rowGap === null && columnGap === null) return null;
        return { row: rowGap, col: columnGap };
    }

    function readColumns(declarations) {
        var match = /(?:^|;)\s*grid-template-columns\s*:\s*([^;}]+)/i.exec(declarations);
        if (!match) return null;

        var value = match[1].replace(/^\s+|\s+$/g, "");
        var repeatMatch = /repeat\(\s*(\d+)\s*,/i.exec(value);
        if (repeatMatch) return parseInt(repeatMatch[1], 10);

        return value.split(/\s+/).length;
    }

    function flowChildren(element) {
        var visible = [], children = element.children;
        for (var i = 0; i < children.length; i++) {
            var childStyle = styleOf(children[i]);
            if (childStyle.display === "none") continue;
            if (childStyle.position === "absolute" || childStyle.position === "fixed") continue;
            visible.push(children[i]);
        }
        return visible;
    }

    function apply(element, info) {
        var computed = styleOf(element);
        var display = (computed.display || "").toLowerCase();
        var children = flowChildren(element);

        if (info.cols !== null || display.indexOf("grid") !== -1) {
            var columns = info.cols || 1;
            var columnGap = info.col || "0px";
            var rowGap = info.row || columnGap;
            var width = columns > 1
                ? "calc((100% - " + (columns - 1) + " * " + columnGap + ") / " + columns + ")"
                : "100%";

            element.style.overflow = "hidden";
            for (var i = 0; i < children.length; i++) {
                children[i].style.boxSizing = "border-box";
                children[i].style.cssFloat = "left";
                children[i].style.width = width;
                children[i].style.marginRight = (columns > 1 && (i % columns) !== columns - 1) ? columnGap : "0px";
                children[i].style.marginBottom = rowGap;
            }
            return;
        }

        if (display.indexOf("flex") === -1) return;

        var isColumn = (computed.flexDirection || "row").toLowerCase().indexOf("column") !== -1;
        var gapSize = isColumn ? info.row : info.col;
        if (!gapSize) return;

        for (var child = 1; child < children.length; child++) {
            if (isColumn) children[child].style.marginTop = gapSize;
            else children[child].style.marginLeft = gapSize;
        }
    }

    function collectCss() {
        var chunks = [];
        var nodes = document.querySelectorAll('link[rel~="stylesheet"], style');

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.tagName.toLowerCase() === "style") {
                chunks.push(node.textContent || "");
                continue;
            }

            if (!node.href) continue;
            try {
                var request = new XMLHttpRequest();
                request.open("GET", node.href, false);
                request.send(null);
                if (request.status === 0 || (request.status >= 200 && request.status < 300)) chunks.push(request.responseText || "");
            } catch (error) {}
        }
        return chunks.join("\n");
    }

    var cssCache = null;

    function run() {
        if (supportsFlexGap()) return;

        if (cssCache === null) cssCache = collectCss().replace(/\/\*[\s\S]*?\*\//g, "");
        var rules = parseBlocks(cssCache, []);
        var touched = [];

        for (var i = 0; i < rules.length; i++) {
            var gap = readGap(rules[i].declarations);
            var columns = readColumns(rules[i].declarations);
            if (!gap && columns === null) continue;

            var elements;
            try {
                elements = document.querySelectorAll(rules[i].selector);
            } catch (error) {
                continue;
            }

            for (var e = 0; e < elements.length; e++) {
                var element = elements[e];
                var info = element.cssPolyInfo;
                if (!info) {
                    info = element.cssPolyInfo = { row: null, col: null, cols: null };
                    touched.push(element);
                }
                if (gap) {
                    if (gap.row !== null) info.row = gap.row;
                    if (gap.col !== null) info.col = gap.col;
                }
                if (columns !== null) info.cols = columns;
            }
        }

        for (var t = 0; t < touched.length; t++) {
            var target = touched[t];
            apply(target, target.cssPolyInfo);
            target.cssPolyInfo = null;
        }
    }

    window.cssPolyfill = { refresh: run };

    function boot() {
        if (supportsFlexGap()) return;
        run();

        var timer;
        window.addEventListener("resize", function () {
            clearTimeout(timer);
            timer = setTimeout(run, 150);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();