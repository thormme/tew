#!/usr/bin/env node

/**
 * main.js
 * https://github.com/thormme/tew
 * Copyright (c) 2015, Michael Schroder (MIT License)
 * A terminal multiplexer created with blessed.
 */
var lastClickPosition = {x: 0, y: 0};
var lastClickTime = Date.now();

var doubleClickTimeout = 250;

process.title = 'tew';

var blessed = require('blessed')
  , screen;

screen = blessed.screen({
	smartCSR: true,
	log: process.env.HOME + '/blessed-terminal.log'
});

var menu = blessed.listbar({
	parent: screen,
	screenKeys: false,
	left: 0,
	top: 0,
	height: 1,
	width: '100%',
	style: {
		fg: 'white',
		bg: 'blue'
	},
	items: {
		File: {
			keys: ['C-f'],
			callback: createTerminal
		}
	}
});

function createTerminal() {
	/*var term = blessed.terminal({
		parent: screen,
		cursor: 'block',
		cursorBlink: true,
		screenKeys: false,
		left: 0,
		top: 2,
		bottom: 2,
		width: '40%',
		border: 'line',
		scrollable: true,
		style: {
			fg: 'default',
			bg: 'default',
			scrollbar: {
				bg: 'blue'
			},
			focus: {
				border: {
					fg: 'green'
				}
			}
		}
	});*/
	
	var term = blessed.terminal({
		parent: screen,
		cursorBlink: true,
		screenKeys: true,
		keys: true,
		left: 0,
		top: 2,
		bottom: 2,
		width: '40%',
		border: 'line',
		scrollable: true,
		scrollbar: {
			ch: ' '
		},
		style: {
			fg: 'default',
			bg: 'default',
			scrollbar: {
				bg: 'blue'
			},
			focus: {
				border: {
					fg: 'green'
				}
			}
		}
	});
	
	prepareTerminal(term);
	term.focus();
}

function prepareTerminal(term) {
	function maximize(rect) {
		term.set('maximized', true);
		term.set('restoreProperties', {
			left: term.left,
			top: term.top,
			width: term.width,
			height: term.height,
		});
		term.setLabel("maximize " + term.top);
		term.top = rect.top;
		term.left = rect.left;
		term.width = rect.width;
		term.height = rect.height;
		screen.render();
	}
	function restore(rect) {
		term.set('maximized', false);
		term.setLabel("restore " + term.top);
		term.top = rect.top;
		term.left = rect.left;
		term.width = rect.width;
		term.height = rect.height;
		screen.render();
	}
	//term.removeAllListeners('render'); // Add reflow to term.js
	//term.removeAllListeners('resize');
	term.set('maximized', false);
	term.on('title', function(title) {
		screen.title = title;
	});
	term.on('mousemove', function(mouse) {
		if (screen.focused == term) {
			term.setLabel("Hi " + mouse.x + " - " + mouse.y + "  -  " + term.left + " - " + term.top);
		}
	});
	screen.on('mouse', function(mouse) {
		if (term.get('drag', false) == 'resize') {
			term.setLabel("resize");
			term.width = mouse.x - term.left + 1;
			term.height = mouse.y - term.top + 1;
			screen.render();
		}
		if (term.get('drag', false) == 'move' && mouse.action !== 'mouseup') {
			term.setLabel("move");
			var dragStart = term.get('dragStart');
			term.left = mouse.x - dragStart.mouseX + dragStart.left;
			term.top = mouse.y - dragStart.mouseY + dragStart.top;
			screen.render();
		}
		if (mouse.action === 'mouseup') {
			if (term.get('maximized', false)) {
				if (term.top > 1) {
					term.set('maximized', false);
					var properties = term.get('restoreProperties', {
						left: term.left,
						top: term.top,
						width: term.width,
						height: term.height
					});
					restore({
						top: term.top,
						left: mouse.x - Math.floor(properties.width/2),
						width: properties.width,
						height: properties.height
					});
				}
			} else {
				if (mouse.x == 0) {
					maximize({
						left: 0,
						top: 1,
						width: Math.floor(screen.width / 2),
						height: screen.height - 1
					});
				}
				if (mouse.x >= screen.width - 1) {
					maximize({
						left: Math.floor(screen.width / 2),
						top: 1,
						width: screen.width - Math.floor(screen.width / 2),
						height: screen.height - 1
					});
				}
				if (mouse.y <= 0) {
					maximize({
						left: 0,
						top: 1,
						width: screen.width,
						height: screen.height - 1
					});
				}
			}
			term.set('drag', false);
		}
	});
	term.on('mousedown', function(mouse) {
		if (mouse.x == term.left + term.width - 1 &&
				mouse.y == term.top + term.height - 1 &&
				term.get('drag', false) != 'resize') {
			term.set('drag', 'resize');
		}
		if (mouse.y == term.top &&
				term.get('drag', false) != 'move') {
			term.set('drag', 'move');
			term.set('dragStart', {
				mouseX: mouse.x,
				mouseY: mouse.y,
				left: term.left,
				top: term.top,
				width: term.width,
				height: term.height
			});
		}
	});
	term.on('focus', function() {
		term.setFront();
	});
	term.on('click', function(mouse) {
		if (mouse.y == term.top) {
			if (Date.now() - lastClickTime < doubleClickTimeout && lastClickPosition.x == mouse.x && lastClickPosition.y == mouse.y) {
				if (!term.get('maximized', false)) {
					term.set('drag', false);
					maximize({
						left: 0,
						top: 1,
						width: screen.width,
						height: screen.height - 1
					});
				} else {
					term.set('maximized', false);
					var properties = term.get('restoreProperties', {
						left: term.left,
						top: term.top,
						width: term.width,
						height: term.height
					});
					restore(properties);
				}
			} else {
				lastClickTime = Date.now();
				lastClickPosition = {x: mouse.x, y: mouse.y};
			}
		}
	});
	term.on('render', function() {
		screen.fillRegion(this.sattr(this.style), '+',
				term.left + term.width - 1, term.left + term.width,
				term.top + term.height - 1, term.top + term.height);
	});
	term.on('mouseup', function(mouse) {
		term.set('drag', false);
	});
	term.on('mousemove', function(mouse) {
		if (term.get('drag', false)) {
			mouse.action = 'mouseup';
			term.emit('mouseup', mouse);
		}
	});
	term.on('wheelup', function(mouse) {
		if (!term.term.mouseEvents) {
			term.scroll(-2);
		}
	});
	term.on('wheeldown', function(mouse) {
		if (!term.term.mouseEvents) {
			term.scroll(2);
		}
	});
}

// Fix scrolling
blessed.Terminal.prototype.render = function() {
  var ret = this._render();
  if (!ret) return;

  this.dattr = this.sattr(this.style);

  var xi = ret.xi + this.ileft
    , xl = ret.xl - this.iright
    , yi = ret.yi + this.itop
    , yl = ret.yl - this.ibottom
    , cursor;

  var scrollback = this.term.ydisp;//this.term.lines.length - (yl - yi);

  for (var y = yi; y < yl; y++) {
    var line = this.screen.lines[y];
    if (!line || !this.term.lines[scrollback + y - yi]) break;

    if (y === yi + this.term.y
        && this.term.cursorState
        && this.screen.focused === this
        && (this.term.ydisp === this.term.ybase || this.term.selectMode)
        && !this.term.cursorHidden) {
      cursor = xi + this.term.x;
    } else {
      cursor = -1;
    }

    for (var x = xi; x < xl; x++) {
      if (!line[x] || !this.term.lines[scrollback + y - yi][x - xi]) break;

      line[x][0] = this.term.lines[scrollback + y - yi][x - xi][0];

      if (x === cursor) {
        if (this.cursor === 'line') {
          line[x][0] = this.dattr;
          line[x][1] = '\u2502';
          continue;
        } else if (this.cursor === 'underline') {
          line[x][0] = this.dattr | (2 << 18);
        } else if (this.cursor === 'block' || !this.cursor) {
          line[x][0] = this.dattr | (8 << 18);
        }
      }

      line[x][1] = this.term.lines[scrollback + y - yi][x - xi][1];

      // default foreground = 257
      if (((line[x][0] >> 9) & 0x1ff) === 257) {
        line[x][0] &= ~(0x1ff << 9);
        line[x][0] |= ((this.dattr >> 9) & 0x1ff) << 9;
      }

      // default background = 256
      if ((line[x][0] & 0x1ff) === 256) {
        line[x][0] &= ~0x1ff;
        line[x][0] |= this.dattr & 0x1ff;
      }
    }

    line.dirty = true;
  }

  return ret;
};


screen.key('C-c', function() {
	return process.exit(0);
});

screen.render();
