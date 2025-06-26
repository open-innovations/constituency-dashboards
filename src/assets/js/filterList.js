function filterList(){
	// Declare variables
	var input, filter, li, i, txtValue, matched, a, _obj;
	_obj = this;
	input = document.getElementById('searchInput');
	input.addEventListener('keyup',function(e){ _obj.keypress(e); });
	li = document.querySelectorAll("#searchable li");
	for (i = 0; i < li.length; i++) {
		a = li[i].getElementsByTagName("a")[0];
		a.addEventListener('keyup',function(e){ _obj.keypress(e); });
	}
	this.navigate = function(e){
		var el = e.target;
		if(e.key=="ArrowDown"){
			e.preventDefault();
			e.stopPropagation(); 
			if(el.tagName=="A"){
				el = el.closest('li');
				el = el.nextElementSibling;
				if(el){
					while(el.hasAttribute('aria-hidden')){
						el = el.nextElementSibling;
					}
					if(el){
						el.querySelector('a').focus();
						return;
					}
				}
				input.focus();
			}else if(el.tagName=="INPUT"){
				// First list item
				document.querySelector("#searchable li:not([aria-hidden]) a").focus();
			}
		}else if(e.key=="ArrowUp"){
			e.preventDefault();
			e.stopPropagation(); 
			if(el.tagName=="A"){
				el = el.closest('li');
				el = el.previousElementSibling;
				if(el){
					while(el.hasAttribute('aria-hidden')){
						el = el.previousElementSibling;
					}
					if(el){
						el.querySelector('a').focus();
						return;
					}
				}
				input.focus();
			}else if(el.tagName=="INPUT"){
				// First list item
				document.querySelector("#searchable li:not([aria-hidden]):last-child a").focus();
			}
		}
	}
	this.keypress = function(e){
		if(!e) e = {};
		if(!e.key) e.key = "";
		if(e.key=="ArrowDown" || e.key=="ArrowUp") return _obj.navigate(e);
		filter = input.value.toUpperCase();
		if(input.value.length == 0){
			for(i = 0; i < li.length; i++){
				li[i].setAttribute('aria-hidden',true);
			}
			return;
		}
		
		// Loop through all list items, and hide those who don't match the search query
		for (i = 0; i < li.length; i++) {
			txtValue = li[i].textContent || li[i].innerText;
			href = li[i].getElementsByTagName("a")[0].getAttribute('href');
			matched = false;
			if(txtValue.toUpperCase().indexOf(filter) > -1) matched = true;
			if(href.toUpperCase().indexOf(filter) > -1) matched = true;
			if(matched) li[i].removeAttribute('aria-hidden');
			else li[i].setAttribute('aria-hidden',true);
		}
	};

	this.keypress();
	return this;
}

function getRandomElementFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

document.addEventListener("DOMContentLoaded", function() {
	// Get all the constituencies from the page
	const list = document.querySelectorAll('#searchable li');
	if(list.length > 0){
		// Attach to an element with class ".luckydip"
		document.querySelectorAll('.luckydip').forEach(el => {
			el.addEventListener('click',function(e){
				e.preventDefault();
				var li = getRandomElementFromArray(list);
				if(li){
					location.href = li.querySelector('a').getAttribute('href');
				}else{
					console.error('No random list item found',list);
				}
			});
			
		});
	}
});

filterList();