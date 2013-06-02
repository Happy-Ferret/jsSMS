/**
 * jsSMS - A Sega Master System/Game Gear emulator in JavaScript
 * Copyright (C) 2012  Guillaume Marty (https://github.com/gmarty)
 * Based on JavaGear Copyright (c) 2002-2008 Chris White
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';



/**
 * Apply several passes to the ast.
 * A pass looks for patterns and optimize the code accordingly.
 * Each pass should must return code in a valid state.
 *
 * @param {Array.<Array.<Bytecode>>} functions
 * @constructor
 */
var Optimizer = function(functions) {
  this.ast = functions;

  if (DEBUG) console.time('Optimizing');
  this.localOptimization();
  if (DEBUG) console.timeEnd('Optimizing');
};

Optimizer.prototype = {
  /**
   * Perform various optimizations limited to a function scope.
   */
  localOptimization: function() {
    this.ast = this.ast.map(this.inlineRegisters);
  },


  /**
   * This pass inline replace reference to defined register by their respective value. Ex:
   * ```
   * a = 0x03;
   * writeMem(0xFFFE, a);
   * ```
   *
   * Is optimized into:
   * ```
   * a = 0x03;
   * writeMem(0xFFFE, 0x03);
   * ```
   *
   * It's not fully working now and has many issues:
   *  * The list of registers is not complete.
   *  * Doesn't work if `ast` is an array of objects, not an object.
   *  * Does not look recursively into the AST.
   *  * Assignment to non literal can be improved (ex: `b = b - 1` forces b to be undefined).
   *  * Only functions calls are optimized.
   *
   *  Anyway, it is just a dummy example to integrate integration in the workflow.
   *
   * @param {Array.<Bytecode>} fn
   * @return {Array.<Bytecode>}
   */
  inlineRegisters: function(fn) {
    var definedReg = {
      b: false,
      c: false,
      d: false,
      e: false,
      h: false,
      l: false,
      a: false
    };
    var definedRegValue = {
      b: {},
      c: {},
      d: {},
      e: {},
      h: {},
      l: {},
      a: {}
    };

    for (var i = 0, length = fn.length; i < length; i++) {
      var ast = fn[i].ast;

      if (!ast || !ast.type)
        continue;

      // 1st, we tag defined registers.
      if (ast.type == 'AssignmentExpression' &&
          ast.left.type == 'Register' &&
          ast.right.type == 'Literal') {
        definedReg[ast.left.name] = true;
        definedRegValue[ast.left.name] = ast.right;
      }

      // And we make sure to tag undefined registers.
      if (ast.type == 'AssignmentExpression' &&
          ast.left.type == 'Register' &&
          ast.right.type != 'Literal') {
        definedReg[ast.left.name] = false;
        definedRegValue[ast.left.name] = {};
      }

      // Then inline arguments.
      if (ast.type == 'CallExpression' &&
          ast.arguments[0] &&
          ast.arguments[0].type == 'Register' &&
          definedReg[ast.arguments[0].name]) {
        ast.arguments[0] = definedRegValue[ast.arguments[0].name];
      }
      if (ast.type == 'CallExpression' &&
          ast.arguments[1] &&
          ast.arguments[1].type == 'Register' &&
          definedReg[ast.arguments[1].name]) {
        ast.arguments[1] = definedRegValue[ast.arguments[1].name];
      }
    }

    return fn;
  }
};