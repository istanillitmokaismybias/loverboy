import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

export default class VideoWallpaperExtension extends Extension {
    enable() {
        // Create the top panel button
        this._indicator = new PanelMenu.Button(0.5, this.metadata.name, false);

        let icon = new St.Icon({
            icon_name: 'video-x-generic-symbolic',
            style_class: 'system-status-icon'
        });
        this._indicator.add_child(icon);

        this._isPlaying = false;
        this._videoPid = null;
        this._selectedVideoPath = null;

        // Create a dropdown menu when they click the icon
        let menuSection = new PopupMenu.PopupMenuSection();
        
        // Button 1: Choose Video
        let chooseItem = new PopupMenu.PopupMenuItem('📁 Choose Video Wallpaper');
        chooseItem.connect('activate', () => {
            this._openFileChooser();
        });
        menuSection.addMenuItem(chooseItem);

        // Button 2: Toggle Play/Stop
        this._toggleItem = new PopupMenu.PopupMenuItem('▶️ Start Video');
        this._toggleItem.connect('activate', () => {
            this._toggleVideo(icon);
        });
        menuSection.addMenuItem(this._toggleItem);

        this._indicator.menu.addMenuItem(menuSection);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    // This function opens the native Ubuntu file explorer
    _openFileChooser() {
        let chooser = new Gio.FileChooserNative({
            title: 'Select a Video for Wallpaper',
            action: Gio.FileChooserAction.OPEN,
            accept_label: 'Select',
            cancel_label: 'Cancel'
        });

        // Only show video files
        let filter = new Gio.FileFilter();
        filter.set_name("Video files");
        filter.add_mime_type("video/*");
        chooser.add_filter(filter);

        chooser.connect('response', (obj, responseId) => {
            if (responseId === Gio.ResponseType.ACCEPT) {
                let file = chooser.get_file();
                this._selectedVideoPath = file.get_path();
                Main.notify('Video Wallpaper', `Selected: ${file.get_basename()}`);
            }
            chooser.destroy();
        });

        chooser.show();
    }

    _toggleVideo(icon) {
        if (!this._selectedVideoPath) {
            Main.notify('Video Wallpaper', 'Please choose a video file first!');
            return;
        }

        if (!this._isPlaying) {
            // START THE VIDEO
            let command = `mpv --wid=0 --loop=inf --no-osc --no-osd-bar --player-operation-mode=pseudo-gui "${this._selectedVideoPath}"`;
            
            try {
                let [success, pid] = GLib.spawn_command_line_async(command);
                if (success) {
                    this._isPlaying = true;
                    this._videoPid = pid;
                    this._toggleItem.label.set_text('⏹️ Stop Video');
                    icon.set_style('color: #00ff00;'); 
                }
            } catch (err) {
                console.log("Error starting video: " + err);
            }
        } else {
            // STOP THE VIDEO
            if (this._videoPid) {
                GLib.spawn_command_line_async(`kill -9 ${this._videoPid}`);
            }
            GLib.spawn_command_line_async('killall mpv');
            
            this._isPlaying = false;
            this._videoPid = null;
            this._toggleItem.label.set_text('▶️ Start Video');
            icon.set_style('color: null;');
        }
    }

    disable() {
        GLib.spawn_command_line_async('killall mpv');
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
