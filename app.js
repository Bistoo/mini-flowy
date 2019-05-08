'use strict';

Handlebars.registerHelper('eq', function (a, b, options) {
	return a === b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerPartial('partial-template-children', document.getElementById('partial-template').innerHTML);

var data = {
	init: function() {
		this.todos = this.store('todos-storage');

		if (this.todos.length === 0) {
			this.todos.splice(0, 0,{
				id: help.giveId(),
				title: '',
				completed: false,
				parent: null
			});
		}
	},

	store: function(namespace, data) {
		if (arguments.length > 1) {
			return localStorage.setItem(namespace, JSON.stringify(data));
		} else {
			var store = localStorage.getItem(namespace);
			return (store && JSON.parse(store)) || [];
		}
	},

	create: function (id, index, nextIndex, inputOne, inputTwo){
		var parentToInsert = this.todos[index].parent;
		 
		if (this.todos[nextIndex] && this.todos[nextIndex].parent === id){
	    parentToInsert = id;
		}
		
		this.todos[index].title = inputOne;

		this.todos.splice((nextIndex), 0,{
			id: help.giveId(),
			title: inputTwo,
			completed: false,
			parent: parentToInsert
		});

		dom.render();
		this.store('todos-storage', this.todos);
		dom.setCaret(this.todos[nextIndex].id,0);
	},

	toggle: function (index, caretPosition) {
		this.todos[index].completed = !this.todos[index].completed;

		dom.render();
		this.store('todos-storage', this.todos);

		if (caretPosition) {
			dom.setCaret(this.todos[index].id, caretPosition);
		}
	},
			
	update: function (index, inputValue) {
		
		if (inputValue || inputValue === "") {
			this.todos[index].title = inputValue;
		}

		this.store('todos-storage', this.todos);
		dom.render();
	},

	indent: function (id, index, caretPosition) {
		var parentId = this.todos[index].parent;
		var childrenArray = help.filterArray(this.todos, parentId);

		if (childrenArray.length > 1) {
			var indexInChildren = help.getIndexFromId(childrenArray, id);

			if (indexInChildren > 0) {
				this.todos[index].parent = childrenArray[indexInChildren - 1].id;
			} 
		}

		this.store('todos-storage', this.todos);
		dom.render();
		dom.setCaret(this.todos[index].id, caretPosition);
	},

	unindent: function (id, index, caretPosition) {
		var parentId = this.todos[index].parent;

		// If no parent, it should not unindent
		if (parentId !== null) {
			var parentIndex = help.getIndexFromId(this.todos, parentId);
			this.todos[index].parent = this.todos[parentIndex].parent;

			this.store('todos-storage', this.todos);
			dom.render();
			
			// Reindexes the todos list according to the DOM
			var indexArray = help.getIdsFromClassname('input-text');
			this.todos = help.reindex(indexArray, this.todos);

			this.store('todos-storage', this.todos);
			dom.render();
			dom.setCaret(id, caretPosition);
	  } else {
			dom.setCaret(id, caretPosition);
		}
	},

	moveUp: function (array, id, index, caretPosition) {
		// indexTarget is where we want to move the element before index
		var indexTarget = index;

		if (index === 0) {
			dom.setCaret(id, caretPosition);
			return;
		}

		for (var i = index + 1; i < array.length ; i++) {
			var isParentResult = help.isParent(array, index, i);

			if (isParentResult === false) {
				indexTarget = i - 1;
				break;
			}
		}	

		var isLastElementParent = help.isParent(array, index, array.length - 1);
		if (isLastElementParent === true) {
			indexTarget = array.length - 1;
		}

		help.insertAndShift(array, index - 1, indexTarget);
    array[index - 1].parent = array[indexTarget].parent;

		this.store('todos-storage', this.todos);
		dom.render();
		dom.setCaret(id, caretPosition);
	},

	moveDown: function (array, id, index, caretPosition) {
		var indexTarget = index + 1;
		
		if (index === array.length - 1) {
			dom.setCaret(id, caretPosition);
			return;
		}	

		for (var i = index + 1; i < array.length ; i++) {
			var isParentResult = help.isParent(array, index, i);

			if (isParentResult === false) {
				indexTarget = i;
				break;
			}
		}
		// if the target is a parent, we can cancel the move down
		var isTargetParent = help.isParent(array, index, indexTarget);
		if (isTargetParent === true) {
			dom.setCaret(id, caretPosition);
			return;
		}

		help.insertAndShift(array, indexTarget, index);
		
		// if there is an element after the target
		if (indexTarget + 1 < array.length) {
			array[index + 1].parent = array[indexTarget + 1].parent;

		// otherwise, the target is the last element in the array
		} else {
			array[index + 1].parent = array[index].parent;
		}

		this.store('todos-storage', this.todos);
		dom.render();
		dom.setCaret(id, caretPosition);
	},

	delete: function (id, index, inputTwo) {
		var childrenArray = help.filterArray(this.todos, id);

		// It should only delete if there are no children and element is not the first in the array
		if (childrenArray.length === 0 && index !== 0) {
			var prevInputLength = this.todos[index - 1].title.length;
			this.todos[index - 1].title += inputTwo; 
			this.todos.splice(index,1);

			this.store('todos-storage', this.todos);
			dom.render();
			dom.setCaret(this.todos[index - 1].id, prevInputLength);
			
		} else {
			dom.setCaret(this.todos[index].id, 0);
		}
	}
};

var help = {
		
	giveId: function () {
		/*jshint bitwise:false */
		var i, random;
		var id = '';

		for (i = 0; i < 32; i++) {
			random = Math.random() * 16 | 0;
			if (i === 8 || i === 12 || i === 16 || i === 20) {
				id += '-';
			}
			id += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
		}
		return id;
	},

	getIndexFromId: function (array, id){
		return array.findIndex(function(todo) {
			return todo.id === id;
		});
	},

	filterArray: function (array, id){
		return array.filter(function(element){
			return element.parent === id;
		});
	},

	getIdsFromClassname: function (classname) {
		var domCollection = document.getElementsByClassName(classname);
		var idArray = [];
		for (var i = 0; i < domCollection.length ; i++) {
			idArray.push(domCollection[i].id)
		};
		return idArray;
	},

	reindex: function (indexArray, array) {
		var reindexedArray = [];
		for (var i in indexArray) {
			for (var j in array) {
				if (indexArray[i] === array[j].id) {
					reindexedArray.push(array[j]);
				}
			}
		}
		return reindexedArray;
	},

	insertAndShift: function (array, indexFrom, indexTo) {
    var elementShifted = array.splice(indexFrom, 1)[0]; 	// takes the element out at indexFrom
    array.splice(indexTo, 0, elementShifted);            	// insert it at indexTo
	},

	isParent: function (array, index1, index2) {
		var result;

		if (array[index2].parent !== null) {
			if (array[index1].id === array[index2].parent) {
				return true;
			} else {
				var parentIndex = this.getIndexFromId(array, array[index2].parent);
				result = this.isParent(array, index1, parentIndex);
				if (result) {
					return result;
				}
			}
		} else if (array[index2].parent === null) {
			return false;
		}

		return result;
	},

	getChildrenFromId: function (array, parentId) {
		var nestedArray = [];
	
		for (var i in array) {
			if (array[i].parent === parentId) {
				var children = this.getChildrenFromId(array, array[i].id);
	
				if (children.length !== 0) {
					array[i].children = children;
				}
				nestedArray.push(array[i]);
			}
		}

		return nestedArray;
	},
};

var dom = {
	init: function () {
		var todoTemplate = document.getElementById('todo-template').innerHTML;
		this.compiledTodoTemplate = Handlebars.compile(todoTemplate);

		this.bindEvents();
		this.render();
		document.getElementsByClassName("input-text")[0].focus();
	},

	bindEvents: function () {
		document.querySelector('.todo-list').addEventListener('change', function(e){
			if (e.target.className === 'toggle'){
				var id = e.target.closest("li").getAttribute("data-id");
				var index = help.getIndexFromId(data.todos, id);
				data.toggle(index);
			}
		}.bind(this));

		document.querySelector('.todo-list').addEventListener('keydown', function(e){
			this.editKeydown(e);
		}.bind(this));

		document.querySelector('.todo-list').addEventListener('focusout', function(e){
			if (e.target.className === 'input-text'){
				var inputValue = e.target.value; 
				var id = e.target.closest("li").getAttribute("data-id");
				var index = help.getIndexFromId(data.todos, id);
				data.update(index, inputValue);
			}
		}.bind(this));
	},

	render: function () {
		var elTodoList = document.getElementsByClassName("todo-list")[0];
		// Clone the todos, so that nestedTodos objects are not linked to the todos objects
		var arrayToRender = JSON.parse(JSON.stringify(data.todos));
		var nestedTodos = help.getChildrenFromId(arrayToRender, null);
		var todoTemplateWithData = this.compiledTodoTemplate(nestedTodos);
		elTodoList.innerHTML = todoTemplateWithData;
	},

	editKeydown: function (e) {
		var elList = e.target.closest('li');
		var input = elList.querySelector('.input-text');
		var id = e.target.closest("li").getAttribute("data-id");;
		var index = help.getIndexFromId(data.todos, id);
		var nextIndex = index + 1;
		var prevIndex = index - 1;

		var selection = window.getSelection().toString();
		var caretPosition = input.selectionStart;
		var inputOne = input.value.substring(0, caretPosition);
		var inputTwo = input.value.substring(caretPosition);

		// DELETION if the caret is at position 0, we want to merge input with the preceding todos
		if (e.key === 'Backspace' && selection === "" && caretPosition === 0) {
			e.preventDefault();
			e.target.blur();
			data.delete(id, index, inputTwo);
		}

		if (event.metaKey === false && e.key === 'Enter') {
			e.target.blur();
			data.create(id, index, nextIndex, inputOne, inputTwo);
		}

		if (event.metaKey === true && e.key === 'Enter') {
			e.target.blur();
			data.toggle(index, caretPosition);
		}

		if (event.shiftKey === true && e.key === 'Tab') {
			e.preventDefault();
			e.target.blur();
			data.unindent(id, index, caretPosition);
		}
		
		if (event.shiftKey === false && e.key === 'Tab') {
			e.preventDefault();
	    e.target.blur();
			data.indent(id, index, caretPosition);
		} 

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			e.target.blur();

			if (index === 0) {
				this.setCaret(id, 0);
			} else {
				this.setCaret(data.todos[prevIndex].id, data.todos[prevIndex].title.length);
			}
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			e.target.blur();

			if (index === data.todos.length - 1) {
				this.setCaret(data.todos[index].id, data.todos[index].title.length);
			} else {
				this.setCaret(data.todos[nextIndex].id, 0);
			}
		}

		if (event.shiftKey === true && e.key === 'ArrowUp') {
			e.preventDefault();
			e.target.blur();
			data.moveUp(data.todos, id, index, caretPosition);
		}

		if (event.shiftKey === true && e.key === 'ArrowDown') {
			e.preventDefault();
			e.target.blur();
			data.moveDown(data.todos, id, index, caretPosition);
		}
	},

	setCaret: function (id, caretPosition) {
    var element = document.getElementById(id);
		element.focus();
    element.setSelectionRange(caretPosition, caretPosition);
	}
};

data.init();
dom.init();
