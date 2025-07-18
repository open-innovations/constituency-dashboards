(function(root){

	if(!root.OI) root.OI = {};
	if(!root.OI.ready){
		root.OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

})(window || this);

OI.ready(function(){
	var styles = document.createElement('style');
	styles.innerHTML = '.anchor { display: none; text-decoration:none; color: inherit; opacity: 0.5; margin-left: 0.25em; } .anchor:focus,  { outline: 2px solid #2254F4; display: inline; } .anchor svg { width: 1em; height: 1em; vertical-align: bottom; }';
	document.head.prepend(styles);

	// Apply the offset
	function offsetAnchor() {
		if(location.hash.length !== 0){
			var el = document.querySelector(location.hash);
			if(el){
				var y = Math.max(0,window.scrollY + el.getBoundingClientRect().top - 16);
				window.scrollTo(window.scrollX, y);
			}else{
				console.warn('No element for '+location.hash);
			}
		}
	}
	offsetAnchor();

	// This will capture hash changes while on the page
	window.addEventListener("hashchange", offsetAnchor);

	function makeAnchor(a){
		a.addEventListener('click',function(e){
			e.preventDefault();
			offsetAnchor();
		});
		var p = a.parentNode;
		this.show = function(e){ a.style.display = 'inline'; };
		this.hide = function(e){ a.style.display = ''; };
		p.style.cursor = 'pointer';
		p.addEventListener('click',function(){ location.href = a.getAttribute('href'); offsetAnchor(); a.focus(); });
		p.addEventListener('mouseover',this.show);
		p.addEventListener('mouseout',this.hide);
		a.addEventListener('focus',this.show);
	}

	var as = document.querySelectorAll('.anchor');
	for(var i = 0; i < as.length; i++) makeAnchor(as[i]);
});