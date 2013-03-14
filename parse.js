/*global document, HTMLElement, Array, HTMLInputElement, console, window,
         XMLHttpRequest, DOMParser*/
(function () {
    "use strict";

    /* library */
    function $(id) {
        return document.getElementById(id);
    }

    function $new(tagName) {
        return document.createElement(tagName);
    }
    HTMLElement.prototype.addEvent = HTMLElement.prototype.addEventListener;
    HTMLElement.prototype.removeEvent = HTMLElement.prototype.removeEventListener;
    HTMLElement.prototype.display = function (display) {
        this.style.display = (display === true) ? "" : "none";
    };
    HTMLElement.prototype.draw = function (draw) {
        this.style.visibility = (draw === true) ? "visible" : "hidden";
    };
    HTMLElement.prototype.hide = function () {
        this.draw(false);
    };
    HTMLElement.prototype.show = function () {
        this.draw(true);
    };
    HTMLInputElement.prototype.clear = function () {
        this.value = "";
    };
    HTMLInputElement.prototype.addAutoClear = function () {
        var that = this;

        function clearInput() {
            that.removeEvent("click", clearInput, false);
            if (that.value === that.defaultValue) {
                that.clear();
            }
        }

        function initClear() {
            if (!that.value) {
                that.value = that.defaultValue;
            }
            that.addEvent("click", clearInput, false);
        }
        this.addEvent("click", clearInput, false);
        this.addEvent("blur", initClear, false);
    };

    Array.prototype.foreach = function (func) {
        var key, ret;
        for (key in this) {
            if (this.hasOwnProperty(key)) {
                ret = func(this[key], key);
                if (ret) {
                    return ret;
                }
            }
        }
    };
    /* library */

    var OFFLINE = false,

        searchForm = $("searchForm"),
        searchInput = $("searchInput"),
        searchSelect = $("searchSelect"),

        resultsDiv = $("resultsDiv"),
        artistInput = $("artistInput"),

        filterForm = $("filterForm"),
        filterInput = $("filterInput"),

        searchlistArea = $("searchlistArea"),
        itemCursor = $("itemCursor"),

        processButton = $("processButton"),
        prevButton = $("prevButton"),
        nextButton = $("nextButton"),

        dumpArea = $("dumpArea"),
        dumpButton = $("dumpButton"),

        titleList,
        titles,

        currentResults,
        currentIdx,
        currentArtist,
        currentSelected,

        selectedResults = [],
        cache = {};

    function displaySelectedResult(selected) {
        currentResults.foreach(function (el) {
            if (el.id === selected.id) {
                el.html.style.backgroundColor = "salmon";
                currentSelected = el.html;
                return true;
            }
        });
    }

    function selectResult(event) {
        try {
            var parent = event.target.parentNode;

            if (currentSelected) {
                currentSelected.style.backgroundColor = "";
            }

            if (currentSelected !== parent) {
                parent.style.backgroundColor = "salmon";

                currentSelected = parent;

                selectedResults[currentIdx] = parent.el;
            } else {
                currentSelected = undefined;
                delete selectedResults[currentIdx];
            }
        } catch (e) {
            console.log(e);
        }
        event.preventDefault();
    }

    function filterResults(event) {
        var value = filterInput.value || "",
            regexpstr = value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&"),
            regexp;

        regexpstr = regexpstr.replace(/\\\*/g, ".*");
        regexp = new RegExp(regexpstr, "ig");
        currentResults.foreach(function (el) {
            el.html.display(el.title.$t.match(regexp) !== null);
        });
        // event.preventDefault();
    }

    function displayWikiResults(response) {
        try {
            var parser = new DOMParser(),
                xml = parser.parseFromString(response.query["export"]["*"], "text/xml"),
                text = xml.getElementsByTagName("text")[0].textContent;

            titles = text.replace(/\n/g, "").match(/title\d+(.+?)\|/g).join("").match(/ = (.+?)\|/g);
            titles.foreach(function (el, key) {
                titles[key] = el.substr(" = ".length, (el.length - " - ".length - 1));
            });
            if (titles.length > 0) {
                searchlistArea.value = titles.join("\n");
            }
        } catch (e) {
            console.log(e);
        }
    }

    function displayWikiInstantResults(response) {
        try {
            var results = response[1];
            if (results.length > 0) {
                searchlistArea.value = results.join("\n");
            }
        } catch (e) {
            console.log(e);
        }
    }

    function displayDiscogsInstantResults(response) {
        try {
            if (response.length > 0) {
                response.foreach(function (el) {
                    if (el.type !== "a") { // only make releases and masters clickable
                        buildImageItem(el, el.name, el.thumb, el.uri, requestSelectedDiscogsRelease);
                    }
                });
            }
        } catch (e) {
            console.log(e);
        }
    }

    function displayDiscogsRelease(response) {
        try {
            console.log(response);

            var release = (response.resp.release || response.resp.master),
                tracklist = release.tracklist,
                strArr = [],
                artists = release.artists[0].name;

            if (!artists.match(/Various/i)) {
                artistInput.value = artists;
            } else {
                artists = "";
            }
            tracklist.foreach(function (el) {
                strArr.push((!artists ? (el.artist && el.artists.length ?
                        el.artists[0].name + " - " : "") : "") + el.title);
            });
            searchlistArea.value = strArr.join("\n");
        } catch (e) {
            console.log(e);
        }
    }

    function buildImageItem(el, titleTxt, imgSrc, linkHref, clickCb) {
        var a = $new("a"),
            title = $new("span"),
            img = $new("img");

        title.innerHTML = titleTxt;
        title.style.width = "120px";
        title.style.height = "23px";
        title.style.overflow = "hidden";
        title.style.display = "block";
        a.appendChild(title);
        img.src = imgSrc || "default.png";
        img.title = title.innerHTML;
        img.style.width = "120px";
        a.appendChild(img);
        a.style.float = "left";
        a.style.margin = "5px";
        a.style.width = "120px";
        a.style.height = "113px";
        a.style.overflowY = "hidden";
        a.href = linkHref;
        a.addEvent("click", clickCb, false);
        resultsDiv.appendChild(a);
        el.html = a;
        a.el = el;
        return a;
    }

    function displayDiscogsResults(response) {
        try {
            console.log(response);

            var results = response.resp.search.searchresults.results;
            currentResults = results;

            resultsDiv.innerHTML = "";
            results.foreach(function (el) {
                buildImageItem(el, el.title, el.thumb, el.uri, requestSelectedDiscogsRelease);
            });
        } catch (e) {
            console.log(e);
        }
    }

    function moveTo(idx) {
        idx += 1;
        itemCursor.style.top = 3 + idx * (4) + (idx > 1 ? (idx - 1) * (4 + 8) : 0) + "px";
    }

    function displayYTBResults(response) {
        try {
            var results = response.feed.entry;
            currentResults = results || [];

            resultsDiv.innerHTML = "";
            if (results) {
                results.foreach(function (el) {
                    var a = $new("a"),
                        title = $new("span"),
                        img = $new("img");

                    a = buildImageItem(el,  el.title.$t, el.media$group.media$thumbnail[0].url, el.link[0].href, selectResult);
                });

                if (selectedResults[currentIdx]) {
                    displaySelectedResult(selectedResults[currentIdx]);
                }
            } else {
                // no result
            }

            if (filterInput.disabled) {
                filterInput.addEvent("keyup", filterResults, false);
                filterInput.addEvent("change", filterResults, false);
                filterInput.disabled = false;
            } else if (currentResults.length === 0) {
                filterInput.removeEvent("keyup", filterResults, false);
                filterInput.removeEvent("change", filterResults, false);
                filterInput.disabled = true;
            }

            nextButton.draw(currentIdx + 1 < titleList.length);
            prevButton.draw(currentIdx > 0);
            moveTo(currentIdx);
        } catch (e) {
            console.log(e);
        }
    }

    function processCurrent() {
        if (titleList[currentIdx]) {
            ytbSearchRequest((currentArtist.value !== currentArtist.defaultValue ?
                    currentArtist + " - " : "") + titleList[currentIdx]);
            return;
            ytbPlaylistRequest("http://www.youtube.com/playlist?list=PLF8667495707EE656&feature=plcp");
        }
    }

    function processPrevious() {
        currentIdx -= 1;
        processCurrent();
    }

    function processNext() {
        currentIdx += 1;
        processCurrent();
    }

    function processList() {
        currentArtist = artistInput.value;

        if (artistInput.value !== artistInput.defaultValue ||
                searchlistArea.value.replace(/\s+/g)) {
            titleList = searchlistArea.value.split("\n");

            currentSelected = undefined;
            selectedResults = [];
            cache = {};
            if (titleList.length > 0) {
                itemCursor.show();

                currentIdx = -1;
                processNext();
            }
        }
    }

    function displayLoading() {
        resultsDiv.innerHTML = '<img src="spinner.gif" style="position:relative; top:160px; left:240px;"/>';
    }

    function ajaxRequest(url, callback) {
        var xhr;

        console.log(url);

        if (!cache[url]) {
            displayLoading();

            xhr = new XMLHttpRequest();
            xhr.open("get", url);
            xhr.addEventListener("readystatechange", function (event) {
                if (xhr.readyState === 4 &&
                        xhr.status === 200) {
                    try {
                        var json = JSON.parse(xhr.responseText);

                        callback(json);
                        cache[url] = json;
                    } catch (e) {
                        console.log(e);
                    }
                }
            }, false);
            xhr.send(null);
        } else {
            callback(cache[url]);
        }
    }

    function jsonpRequest(url) {
        var loadScript = $new("script");

        loadScript.type = "text/Javascript";
        // loadScript.id = "bodyRiddle";
        loadScript.src = url;
        // loadScript.addEventListener("load", function (e) {
            // console.log(e);
        // }, false);
        document.body.appendChild(loadScript);
    }

    function wikiExportRequest(title) {
        jsonpRequest("http://en.wikipedia.org/w/api.php?action=query&export&format=json&callback=displayWikiExport&titles=" + title);
    }

    function wikiSearchRequest(string) {
        jsonpRequest("http://en.wikipedia.org/w/api.php?action=query&list=search&format=json&callback=displayWikiResults&srsearch=" + string);
    }

    function wikiOpenSearchRequest(string) {
        jsonpRequest("http://en.wikipedia.org/w/api.php?action=opensearch&limit=10&namespace=0&format=json&callback=displayWikiInstantResults&search=" + encodeURI(string));
    }

    function discogsInstantSearchRequest(string) {
        ajaxRequest("http://www.discogs.com/search/ac?type=a_m_r_l3&q=" + encodeURI(string), displayDiscogsInstantResults);
    }

    function discogsSearchRequest(string) {
        if (OFFLINE === true) {
            jsonpRequest("discogs" + string.replace(/ /g, "+").replace(/\//g, "-") + ".json");
        } else {
            jsonpRequest("http://api.discogs.com/search?type=releases&f=json&callback=displayDiscogsResults&q=" + string);
        }
    }

    function discogsReleaseRequest(url) {
        var uri = url.match(/(release|master)\/\d+$/)[0];

        if (OFFLINE === true) {
            jsonpRequest("discogs" + uri.replace(/ /g, "+").replace(/\//g, "-") + ".json");
        } else {
            jsonpRequest("http://api.discogs.com/" + uri + "?callback=displayDiscogsRelease&f=json");
        }
    }

    function ytbPlaylistRequest(url) {
        var id = url.match(/list=PL([^\&]+)/),
            apiUrl;

        if (id && id[1]) {
            id = id[1];
            if (OFFLINE === true) {
                jsonpRequest(id + ".json");
            } else {
                apiUrl = "https://gdata.youtube.com/feeds/api/playlists/" + id + "?v=2&alt=json";
                ajaxRequest(apiUrl, displayYTBResults);
            }
        }
    }

    function ytbSearchRequest(string) {
        var url;

        if (OFFLINE === true) {
            url = string.replace(/ /g, "+").replace(/\//g, "-") + ".json";
            jsonpRequest(url);
        } else {
            url = "https://gdata.youtube.com/feeds/api/videos?alt=json&v=2&q=" +
                string.replace(/ /g, "+");
            ajaxRequest(url, displayYTBResults);
        }
    }

    function requestSelectedDiscogsRelease(event) {
        try {
            var parent = event.target.parentNode;

            discogsReleaseRequest(parent.el.uri);
        } catch (e) {
            console.log(e);
        }
        event.preventDefault();
    }

    var timer,
        lastTime;
    function instantSearch() {
        try {

            clearTimeout(timer);
            timer = setTimeout(function () {
                var value = searchInput.value;
                if (value && value.length > 2 && !(value[value.length - 1] + "").match(/\s/)) {
                    var func;
                    switch (searchSelect.value) {
                    case "discogs":
                        func = discogsInstantSearchRequest;
                        break;
                    case "ytb":
                        //func = ytbSearchRequest;
                        break;
                    case "wiki":
                        func = wikiOpenSearchRequest;
                        break;
                    }
                    if (func) {
                        searchlistArea.value = "";
                        func(value);
                    }
                }
            }, 1000);
        } catch (e) {
            console.log(e);
        }
    }

    function dumpData() {
        var data = [],
            json;

        selectedResults.foreach(function (el) {
            data.push({
                "name": el.title.$t,
                "url": el.link[0].href
            });
        });
        json = JSON.stringify(data);
        dumpArea.value = json;
        console.log(json);
    }

    function searchOnSelected() {
        try {
            var value = searchInput.value,
                func;

            if (value.length > 2) {
                displayLoading();
                switch (searchSelect.value) {
                case "discogs":
                    func = discogsSearchRequest;
                    break;
                case "ytb":
                    func = ytbSearchRequest;
                    break;
                case "wiki":
                    func = wikiSearchRequest;
                    break;
                }
                if (func) {
                    searchlistArea.value = "";
                    func(value);
                }
            }
        } catch (e) {
            console.log(e);
        }
        event.preventDefault();
    }

    (function main() {
        window.displayYTBResults = displayYTBResults;
        window.displayDiscogsResults = displayDiscogsResults;
        window.displayDiscogsRelease = displayDiscogsRelease;
        window.displayWikiResults = displayWikiResults;
        window.displayWikiInstantResults = displayWikiInstantResults;
        window.dumpData = dumpData;
        window.ajaxRequest = ajaxRequest;

        searchInput.addAutoClear();
        artistInput.addAutoClear();
        filterInput.addAutoClear();

        searchForm.addEvent("submit", searchOnSelected, false);
        searchInput.addEvent("keyup", instantSearch, false);

        processButton.addEvent("click", processList, false);
        nextButton.addEvent("click", processNext, false);
        prevButton.addEvent("click", processPrevious, false);

        dumpButton.addEvent("click", dumpData, false);

        // searchlistArea.value = [
            // "New Year Storm",
            // "Volcan Vein",
            // "Truncation Horn",
            // "For Wolves Crew",
            // "Violenl",
            // "Gaskarth / Cyrk Dedication",
            // "Ache Of The North",
            // "Mercy Sines",
            // "Hot May Slides",
            // "Beg",
            // "Penultimate Persian"
        // ].join("\n");
        // artistInput.value = "Clark";

        // wikiRequest("Invaders_Must_Die");
        // discogsSearchRequest("Invaders Must Die");
    }());
}());
