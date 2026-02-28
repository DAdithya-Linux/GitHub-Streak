// /* extension.js
//  *
//  * This program is free software: you can redistribute it and/or modify
//  * it under the terms of the GNU General Public License as published by
//  * the Free Software Foundation, either version 2 of the License, or
//  * (at your option) any later version.
//  *
//  * This program is distributed in the hope that it will be useful,
//  * but WITHOUT ANY WARRANTY; without even the implied warranty of
//  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  * GNU General Public License for more details.
//  *
//  * You should have received a copy of the GNU General Public License
//  * along with this program.  If not, see <http://www.gnu.org/licenses/>.
//  *
//  * SPDX-License-Identifier: GPL-2.0-or-later
//  */

// import GObject from 'gi://GObject';
// import St from 'gi://St';

// import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
// import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
// import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

// import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// const Indicator = GObject.registerClass(
// class Indicator extends PanelMenu.Button {
//     _init() {
//         super._init(0.0, _('My Shiny Indicator'));

//         this.add_child(new St.Icon({
//             icon_name: 'face-smile-symbolic',
//             style_class: 'system-status-icon',
//         }));

//         let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
//         item.connect('activate', () => {
//             Main.notify(_('Whatʼs up, folks?'));
//         });
//         this.menu.addMenuItem(item);
//     }
// });

// export default class IndicatorExampleExtension extends Extension {
//     enable() {
//         this._indicator = new Indicator();
//         Main.panel.addToStatusArea(this.uuid, this._indicator);
//     }

//     disable() {
//         this._indicator.destroy();
//         this._indicator = null;
//     }
// }






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

    _refresh() {
        const username = 'dadithya01'; // Hardcoded as requested
        const url = `https://github-contributions-api.deno.dev/${username}.json`;
        
        const message = Soup.Message.new('GET', url);
        
        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, res) => {
            try {
                const bytes = session.send_and_read_finish(res);
                const decoder = new TextDecoder('utf-8');
                const responseText = decoder.decode(bytes.get_data());
                const data = JSON.parse(responseText);
                
                // Navigate safely to today's count
                const weeks = data.contributions;
                const lastWeek = weeks[weeks.length - 1];
                const today = lastWeek[lastWeek.length - 1];
                
                const count = today.count || 0;
                
                this._label.set_text(`🔥 ${count}`);
                this._label.set_style(count > 0 ? 'color: #3fb950; font-weight: bold;' : 'color: #f85149;');
                
            } catch (e) {
                logError(e, 'GitHub Streak Error');
                this._label.set_text('🔥 !');
            }
        });

        // Auto-refresh every 30 minutes
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