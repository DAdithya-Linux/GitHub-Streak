import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import Gio from 'gi://Gio';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('GitHub Streak'));

        this._session = new Soup.Session();

        this._box = new St.BoxLayout({ 
            vertical: false, 
            x_expand: true, 
            y_expand: true 
        });
        
        this._label = new St.Label({
            text: '🔥 ...',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._box.add_child(this._label);
        this.add_child(this._box);

        this._refresh();
    }

    _refresh() {
    // 1. Define the command
    const query = `query { viewer { contributionsCollection { contributionCalendar { weeks { contributionDays { contributionCount date } } } } } }`;
    
    // 2. Setup the process (don't run it yet)
    let proc = new Gio.Subprocess({
        argv: ['gh', 'api', 'graphql', '-f', `query=${query}`],
        flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
    });
    proc.init(null);

    // 3. Start the process ASYNCHRONOUSLY
    // This tells GNOME: "Run this in the background and call me when done"
    proc.communicate_utf8_async(null, null, (process, result) => {
        try {
            let [ok, stdout, stderr] = process.communicate_utf8_finish(result);
            
            if (ok) {
                const data = JSON.parse(stdout);
                const weeks = data.data.viewer.contributionsCollection.contributionCalendar.weeks;
                const lastWeek = weeks[weeks.length - 1];
                const today = lastWeek.contributionDays[lastWeek.contributionDays.length - 1];
                
                const count = today.contributionCount || 0;
                this._label.set_text(`🔥 ${count}`);
                this._label.set_style(count > 0 ? 'color: #3fb950; font-weight: bold;' : 'color: #f85149;');
            }
        } catch (e) {
            logError(e, 'GitHub Async Error');
            this._label.set_text('🔥 !');
        }
    });

    // 4. Set the timer for the NEXT refresh (e.g., 900 seconds)
    this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 600, () => {
        this._refresh();
        return GLib.SOURCE_REMOVE;
    });
}

    destroy() {
        if (this._timeout) GLib.source_remove(this._timeout);
        super.destroy();
    }
});

export default class GitHubStreakExtension extends Extension {
    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
    if (this._indicator) {
        // This is crucial to stop the background loop when you turn it off
        this._indicator.destroy();
        this._indicator = null;
    }
}
}