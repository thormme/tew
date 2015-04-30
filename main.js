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
	dockBorders: true,
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

var desktop = blessed.box({
	parent: screen,
	left: 0,
	top: 1,
	bottom: 0,
	width: '100%'
});
	
/*var mouseBox = blessed.box({
	parent: screen,
	cursorBlink: true,
	screenKeys: true,
	keys: true,
	right: 0,
	top: 0,
	bottom: 0,
	width: '30%',
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
});*/

function createTerminal() {
	var term = blessed.terminal({
		parent: desktop,
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
		term.setLabel("maximize " + rect.height);
		term.top = rect.top;
		term.left = rect.left;
		term.width = rect.width;
		if (rect.bottom !== undefined) {
			term.height = undefined;
			term.bottom = rect.bottom;
		} else {
			term.height = rect.height;
		}
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
		if (typeof mouseBox !== 'undefined') {
			if (mouseBox.content.lastIndexOf("mousemove\n") > mouseBox.content.length - 20 && mouse.action == "mousemove") {
				mouseBox.content += "-";
			} else {
				mouseBox.content += mouse.action + "\n";
			}
			mouseBox.setScrollPerc(100);
			mouseBox.setFront();
		}
		if (term.get('drag', false) == 'resize') {
			term.setLabel("resize");
			term.width = Math.max(mouse.x - term.aleft + 1, 2);
			term.height = Math.max(mouse.y - term.atop + 1, 2);
			screen.render();
		}
		if (term.get('drag', false) == 'move' && mouse.action !== 'mouseup') {
			term.setLabel("move");
			var dragStart = term.get('dragStart');
			term.aleft = mouse.x - dragStart.mouseX + dragStart.left;
			term.atop = mouse.y - dragStart.mouseY + dragStart.top;
			screen.render();
		}
		if (term.get('drag', false) == 'move' && mouse.action === 'mouseup') {
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
						top: 0,
						width: "50%",
						height: '100%'
					});
				}
				if (mouse.x >= screen.width - 1) {
					maximize({
						left: "50%",
						top: 0,
						width: "50%",
						height: '100%'
					});
				}
				if (mouse.y <= 0) {
					maximize({
						left: 0,
						top: 0,
						width: "100%",
						height: '100%'
					});
				}
			}
		}
		if (term.get('drag', false) != false && mouse.action === 'mouseup') {
			term.set('drag', false);
		}
	});
	term.on('mousedown', function(mouse) {
		if (mouse.x == term.aleft + term.width - 1 &&
				mouse.y == term.atop + term.height - 1 &&
				term.get('drag', false) != 'resize') {
			term.set('drag', 'resize');
		}
		if (mouse.y == term.atop &&
				term.get('drag', false) != 'move') {
			term.set('drag', 'move');
			term.set('dragStart', {
				mouseX: mouse.x,
				mouseY: mouse.y,
				left: term.aleft,
				top: term.atop,
				width: term.width,
				height: term.height
			});
		}
	});
	term.on('focus', function() {
		term.setFront();
	});
	term.on('click', function(mouse) {
		if (mouse.y == term.atop) {
			if (Date.now() - lastClickTime < doubleClickTimeout && lastClickPosition.x == mouse.x && lastClickPosition.y == mouse.y) {
				if (!term.get('maximized', false)) {
					term.set('drag', false);
					maximize({
						left: 0,
						top: 0,
						width: "100%",
						height: '100%'
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
		screen.fillRegion(this.sattr(this.style), '┛',
				term.aleft + term.width - 1, term.aleft + term.width,
				term.atop + term.height - 1, term.atop + term.height);
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
