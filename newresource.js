/**
 * NewResource Module for the Cloud9 IDE
 * @author Mostafa Eweda <mostafa@c9.io>
 * @copyright 2013, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
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
        var apf         = imports.apf;

        var markup    = require("text!./newresource.xml");
        // ui elements
        var trFiles, winNewFileTemplate, btnFileTemplateSave, btnFileTemplateCancel, lstFileTemplates;

        /***** Initialization *****/

        var plugin   = new Plugin("Ajax.org", main.consumes);
        var emit     = plugin.getEmitter();
        var readonly = c9.readonly;

        var loaded   = false;
        function load(callback){
            if (loaded) return false;
            loaded = true;

            commands.addCommand({
                name   : "newfile",
                hint   : "create a new file resource",
                msg    : "New file created.",
                bindKey: { mac: "Option-Shift-N", win: "Ctrl-N" },
                exec   : function () {
                    newFile();
                }
            }, plugin);

            commands.addCommand({
                name: "newfiletemplate",
                hint: "create a new directory resource",
                msg: "New directory created.",
                bindKey: { mac: "Option-Ctrl-N", win: "Alt-N" },
                exec: function () {
                    newFileTemplate();
                }
            }, plugin);

            commands.addCommand({
                name: "newfolder",
                hint: "open the new file template dialog",
                bindKey: { mac: "Option-Ctrl-Shift-N", win: "Ctrl-Shift-N" },
                exec: function () {
                    newFolder();
                }
            }, plugin);

            menus.addItemByPath("File/New File", new ui.item({
                disabled: readonly,
                command : "newfile"
            }), 100, plugin);
            menus.addItemByPath("File/New From Template...", new ui.item({
                disabled: readonly,
                command : "newfiletemplate"
            }), 200, plugin);
            menus.addItemByPath("File/New Folder", new ui.item({
                disabled: readonly,
                command : "newfolder"
            }), 300, plugin);
            menus.addItemByPath("File/~", new ui.divider(), 400, plugin);
        }

        var drawn = false;
        function draw () {
            if (drawn) return;
            drawn = true;

            ui.insertMarkup(null, markup, plugin);

            winNewFileTemplate    = plugin.getElement("winNewFileTemplate");
            lstFileTemplates      = plugin.getElement("lstFileTemplates");
            btnFileTemplateSave   = plugin.getElement("btnFileTemplateSave");
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

            emit("draw");
        }

        /***** Methods *****/

        function getDirPath () {
            var node = tree.getSelectedNode();
            var path = node.getAttribute("path");
            if (node.getAttribute("type") == "file" || node.tagName == "file")
                path = path.replace(/\/[^\/]*$/, "/");

            if (!/\/$/.test(path))
                path += "/";

            return path;
        }

        function newFile(type, value, path) {
            if (readonly) return;

            draw();

            var filePath;
            var name  = "Untitled";
            var count = 0;
            type      = type || "";
            path      = path || getDirPath();

            while (tabs.findPage(filePath = path + name + (count || "") + type))
                count++;

            tabs.open({
                path     : filePath,
                value    : value || "",
                active   : true,
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

        function newFolder(path, callback) {
            tree.createFolder(path, false, callback || function(){});
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
            drawn  = false;
        });

        /***** Register and define API *****/

        /**
         * newresource API
         **/
        plugin.freezePublicAPI({
            /**
             * Create a new file in the workspace
             *
             * @param type {String} the encoding of the content for the file
             * @param value {String} the content of the file
             * @param path {String} the path of the file to write
             */
            newFile: newFile,

            /**
             * Show the new file template window to create a file
             */
            newFileTemplate: newFileTemplate,

            /**
             * Create a new folder in the workspace and starts its renaming
             *
             * @param path {String} the path of the directory to create
             * @param callback(err) {Function} called after the folder is created
             */
            newFolder: newFolder
        });

        register(null, {
            newresource: plugin
        });
    }
});
