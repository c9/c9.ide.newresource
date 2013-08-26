/**
 * Refactor Module for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
/*global define apf*/
"use strict";
define(function(require, exports, module) {
    main.consumes = [
        "plugin", "c9", "ui", "menus", "tabs", "fs", "commands",
        "tree", "apf"
    ];
    main.provides = ["newresource"];
    return main;

    function main(options, imports, register) {
        var Plugin      = imports.plugin;
        var c9          = imports.c9;
        var ui          = imports.ui;
        var fs          = imports.fs;
        var menus       = imports.menus;
        var commands    = imports.commands;
        var tabs        = imports.tabs;
        var tree        = imports.tree;

        var markup    = require("text!./newresource.xml");
        // ui elements
        var trFiles, winNewFileTemplate, btnFileTemplateSave, btnFileTemplateCancel, lstFileTemplates;

        /***** Initialization *****/

        var plugin = new Plugin("Ajax.org", main.consumes);
        var emit   = plugin.getEmitter();

        var readonly = c9.readonly;

        var loaded = true;
        function load(callback){
            if (loaded) return false;
            loaded = true;

            commands.addCommand({
                name: "newfile",
                hint: "create a new file resource",
                msg: "New file created.",
                bindKey: {mac: "Option-Shift-N", win: "Ctrl-N"},
                exec: function () {
                    newFile();
                }
            }, plugin);

            commands.addCommand({
                name: "newfiletemplate",
                hint: "create a new directory resource",
                msg: "New directory created.",
                bindKey: {mac: "Option-Ctrl-N", win: "Alt-N"},
                exec: function () {
                    newFileTemplate();
                }
            }, plugin);

            commands.addCommand({
                name: "newfolder",
                hint: "open the new file template dialog",
                bindKey: {mac: "Option-Ctrl-Shift-N", win: "Ctrl-Shift-N"},
                exec: function () {
                    newFolder();
                }
            }, plugin);

            menus.addItemByPath("File/New File", new apf.item({
                disabled: readonly,
                command : "newfile"
            }), 100, plugin);
            menus.addItemByPath("File/New From Template...", new apf.item({
                disabled: readonly,
                command : "newfiletemplate"
            }), 200, plugin);
            menus.addItemByPath("File/New Folder", new apf.item({
                disabled: readonly,
                command : "newfolder"
            }), 300, plugin);
            menus.addItemByPath("File/~", new apf.divider(), 400, plugin);
        }

        var drawn = false;
        function draw () {
            if (drawn) return;
            drawn = true;

            ui.insertMarkup(null, markup, plugin);
            winNewFileTemplate = plugin.getElement("winNewFileTemplate");
            lstFileTemplates = plugin.getElement("lstFileTemplates");
            btnFileTemplateSave = plugin.getElement("btnFileTemplateSave");
            btnFileTemplateCancel = plugin.getElement("btnFileTemplateCancel");

            btnFileTemplateSave.on("click", function(){
                newFile('.' + lstFileTemplates.value, lstFileTemplates.selected.firstChild.nodeValue);
                winNewFileTemplate.hide();
            });

            btnFileTemplateCancel.on("click", function(){
                winNewFileTemplate.hide();
            });

            lstFileTemplates.on("afterchoose", function() {
                btnFileTemplateSave.dispatchEvent('click');
            });

            tree.getElement("trFiles", function(element){
                trFiles = element;
            });

            emit("draw");
        }

        /***** Methods *****/

        function getDirPath () {
            var path;
            if (trFiles) {
                var sel = trFiles.selected;

                if (!sel) {
                    trFiles.select(trFiles.$model.queryNode('folder'));
                    sel = trFiles.selected;
                }

                if (sel)
                    path = sel.getAttribute("path");
            }
            if (!path)
                path = "/";
            return path;
        }

        function newFile(type, value, path) {
            draw();
            if (readonly)
                return;
            if (!type) type = "";

            if (!path)
                path = getDirPath();

            if (!/\/$/.test(path))
                path += "/";

            var name = "Untitled", count = 0;
            var filePath;
            while (tabs.findPage(filePath = path + name + (count || "") + type))
                count++;

            tabs.open({
                path     : filePath,
                value    : value || "",
                active   : true,
                init: true,
                document : {
                    meta : {
                        newfile : true
                    }
                }
            }, function(){});

            // ide.dispatchEvent("track_action", {type: "template", template: type});
        }

        function newFileTemplate(){
            draw();
            winNewFileTemplate.show();
        }

        function newFolder() {
            draw();

            var dirPath = getDirPath();

            createFolder(0);
            function createFolder(count) {
                var name = "Untitled" + (count || "");
                var path = dirPath + name;
                fs.mkdir(path, function (err) {
                    if (err)
                        createFolder(count+1);
                    var folder = trFiles.$model.queryNode("//folder[@path='" + path + "']");
                    if (folder) {
                        trFiles.focus();
                        trFiles.select(folder);
                        apf.activeElement.startRename();
                    }
                });
            }
            return false;
        }

        /***** Lifecycle *****/
        plugin.on("load", function(){
            load();
        });
        plugin.on("enable", function(){

        });
        plugin.on("disable", function(){

        });
        plugin.on("unload", function(){
            loaded = false;
        });

        /***** Register and define API *****/

        /**
         * Finder implementation using nak
         **/
        plugin.freezePublicAPI({
            newFile: newFile,

            newFileTemplate: newFileTemplate,

            newFolder: newFolder
        });

        register(null, {
            newresource: plugin
        });
    }
});
