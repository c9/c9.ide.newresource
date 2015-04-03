define(function(require, exports, module) {
    "use strict";
    
    main.consumes = [
        "Plugin", "c9", "ui", "menus", "tabManager", "commands", "tree"
    ];
    main.provides = ["newresource"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var c9 = imports.c9;
        var ui = imports.ui;
        var menus = imports.menus;
        var commands = imports.commands;
        var tabs = imports.tabManager;
        var tree = imports.tree;

        var markup = require("text!./newresource.xml");

        /***** Initialization *****/

        var plugin = new Plugin("Ajax.org", main.consumes);
        var emit = plugin.getEmitter();
        
        var readonly = c9.readonly;
        var defaultExtension = "";
        
        var winNewFileTemplate, btnFileTemplateSave, btnFileTemplateCancel;
        var lstFileTemplates;

        var loaded = false;
        function load(callback) {
            if (loaded) return false;
            loaded = true;

            commands.addCommand({
                name: "newfile",
                hint: "create a new file resource",
                msg: "New file created.",
                bindKey: { mac: "Ctrl-N", win: "Ctrl-N" },
                exec: function () { newFile(); }
            }, plugin);

            commands.addCommand({
                name: "newfiletemplate",
                hint: "open the new file template dialog",
                msg: "New directory created.",
                bindKey: { mac: "Ctrl-Shift-N", win: "Ctrl-Shift-N" },
                exec: function() { newFileTemplate(); }
            }, plugin);

            commands.addCommand({
                name: "newfolder",
                hint: "create a new directory resource",
                exec: function(){ newFolder(); }
            }, plugin);

            menus.addItemByPath("File/New File", new ui.item({
                disabled: readonly,
                command: "newfile"
            }), 100, plugin);
            menus.addItemByPath("File/New From Template...", new ui.item({
                disabled: readonly,
                command: "newfiletemplate"
            }), 200, plugin);
            // menus.addItemByPath("File/New Folder", new ui.item({
            //     disabled: readonly,
            //     command: "newfolder"
            // }), 300, plugin);
            // menus.addItemByPath("File/~", new ui.divider(), 400, plugin);
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

            emit("draw");
        }

        /***** Methods *****/

        function getDirPath () {
            var node = tree.getSelectedNode();
            var path = node.path || node.getAttribute("path");
            if (node.getAttribute ? node.getAttribute("type") == "file" || node.tagName == "file" : !node.isFolder)
                path = path.replace(/\/[^\/]*$/, "/");

            if (!/\/$/.test(path))
                path += "/";

            return path;
        }

        function newFile(type, value, path) {
            if (readonly) return;

            draw();

            var filePath;
            var name = "Untitled";
            var count = 1;
            type = type || "";
            path = path || getDirPath();
            var ext = defaultExtension;

            while (tabs.findTab(filePath = path + name + (count || "") + type + ext))
                count++;

            tabs.open({
                path: filePath,
                value: value || "",
                active: true,
                document: {
                    meta: {
                        newfile: true
                    }
                }
            }, function(err, tab) {
                if (err)
                    return; // reported already
            });

            // ide.dispatchEvent("track_action", {type: "template", template: type});
        }

        function newFileTemplate(){
            draw();
            winNewFileTemplate.show();
        }

        function newFolder(path, callback) {
            tree.createFolder(path, false, callback || function(){});
        }
        
        function addFileTemplate(data, plugin) {
            if (!drawn)
                return plugin.on("draw", addFileTemplate.bind(this, data, plugin));
            // if (!plugin.loaded) return;
            
            data = data.split("\n");
            
            var firstLine = data.shift().replace(/\/\*|\*\//g, "").trim();
            var template = { text: data.join("\n") };
            firstLine.split(";").forEach(function(n){
                if (!n) return;
                var info = n.split(":");
                template[info[0].trim()] = info[1].trim();
            });
            
            plugin.getElement("mdlFileTemplates").appendXml(
                '<item value="' + template.caption 
                    + '" icon="page_white_text.png" caption="' + template.caption 
                    + '"><![CDATA[' + template.text + ']]></item>'
            );
        }
        
        /***** Lifecycle *****/
        
        plugin.on("load", function(){
            load();
        });
        plugin.on("unload", function(){
            loaded = false;
            drawn = false;
            winNewFileTemplate = null;
            btnFileTemplateSave = null;
            btnFileTemplateCancel = null;
            lstFileTemplates = null;
            defaultExtension = null;
        });

        /***** Register and define API *****/

        /**
         * Adds File->New File and File->New Folder menu items as well as the
         * commands for opening a new file as well as an API.
         * @singleton
         **/
        plugin.freezePublicAPI({
            /**
             * Create a new file in the workspace
             *
             * @param {String} type   The encoding of the content for the file
             * @param {String} value  The content of the file
             * @param {String} path   The path of the file to write
             */
            newFile: newFile,

            /**
             * Show the new file template window to create a file
             */
            newFileTemplate: newFileTemplate,

            /**
             * Create a new folder in the workspace and starts its renaming
             *
             * @param {String}   name          The name of the folder to create
             * @param {String}   dirPath       The directory to create the folder into
             * @param {Function} callback      Called after the folder is created
             * @param {Error}    callback.err  The error object if any error occured.
             */
            newFolder: newFolder,
            
            /**
             * 
             */
            open: open,
            
            /**
             * 
             */
            addFileTemplate: addFileTemplate,
            
            /**
             * Sets the default extension for newly created files
             * @param extension  The default extension to use
             */
            set defaultExtension(extension) {
                defaultExtension = extension ? "." + extension : "";
                tree.defaultExtension = extension;
            }
        });

        register(null, {
            newresource: plugin
        });
    }
});
