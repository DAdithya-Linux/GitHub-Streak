import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

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

    // _refresh() {
    //     const username = 'dadithya01'; // Hardcoded as requested
    //     const url = `https://github-contributions-api.deno.dev/${username}.json`;
        
    //     const message = Soup.Message.new('GET', url);
        
    //     this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, res) => {
    //         try {
    //             const bytes = session.send_and_read_finish(res);
    //             const decoder = new TextDecoder('utf-8');
    //             const responseText = decoder.decode(bytes.get_data());
    //             const data = JSON.parse(responseText);
                
    //             // Navigate safely to today's count
    //             const weeks = data.contributions;
    //             const lastWeek = weeks[weeks.length - 1];
    //             const today = lastWeek[lastWeek.length - 1];
                
    //             const count = today.count || 0;
                
    //             this._label.set_text(`🔥 ${count}`);
    //             this._label.set_style(count > 0 ? 'color: #3fb950; font-weight: bold;' : 'color: #f85149;');
                
    //         } catch (e) {
    //             logError(e, 'GitHub Streak Error');
    //             this._label.set_text('🔥 !');
    //         }
    //     });

    //     // Auto-refresh every 30 minutes
    //     this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1800, () => {
    //         this._refresh();
    //         return GLib.SOURCE_REMOVE;
    //     });
    // }

    _refresh() {
    try {
        // The GraphQL query specifically asks for your contribution calendar
        const query = `
        query {
          viewer {
            contributionsCollection {
              contributionCalendar {
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }`;

        // Using GLib to run the 'gh' command on your system
        const [ok, out, err, exit] = GLib.spawn_command_line_sync(
            `gh api graphql -f query="${query}"`
        );

        if (ok && exit === 0) {
            const data = JSON.parse(new TextDecoder().decode(out));
            const weeks = data.data.viewer.contributionsCollection.contributionCalendar.weeks;
            const lastWeek = weeks[weeks.length - 1];
            const today = lastWeek.contributionDays[lastWeek.contributionDays.length - 1];
            
            const count = today.contributionCount || 0;
            
            this._label.set_text(`🔥 ${count}`);
            this._label.set_style(count > 0 ? 'color: #3fb950; font-weight: bold;' : 'color: #f85149;');
        } else {
            console.error('GH CLI Error:', new TextDecoder().decode(err));
            this._label.set_text('🔥 🔑?'); // Likely needs 'gh auth login'
        }
    } catch (e) {
        logError(e, 'GitHub Extension Crash');
        this._label.set_text('🔥 !');
    }

    // Refresh every 30 minutes
    this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1800, () => {
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
        this._indicator.destroy();
        this._indicator = null;
    }
}