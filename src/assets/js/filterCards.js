/* Open Innovations code to filter dashboard cards */
(function(root){

	if(!root.OI) root.OI = {};
	if(!root.OI.ready){
		root.OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	function filter(sections,txt){

		var s,i,txtValue,matched;

		txt = txt.toUpperCase();
		var reg = new RegExp("(data|title)[^\=]*=\"[^\"]*"+txt+"[^\"]*\"","i");
		
		// Loop through sections
		for(s = 0; s < sections.length; s++){
			sections[s].matched = 0;
			// Loop through all cards, and hide those who don't match the search query
			for(i = 0; i < sections[s].cards.length; i++){
				matched = false;
				txtValue = (sections[s].cards[i].textContent || sections[s].cards[i].innerText).toUpperCase();
				if(txt.length==0) matched = true;
				if(txtValue.indexOf(txt) > -1) matched = true;
				if(sections[s].cards[i].innerHTML.match(reg)) matched = true;
				sections[s].cards[i].style.display = (matched ? "" : "none");
				if(matched) sections[s].matched++;
			}
			sections[s].el.style.display = (sections[s].matched > 0 || txt.length==0 ? "":"none");
		}
	}

	root.OI.filterCards = function(){

		// Declare variables
		var el, input, sections = [];
		el = document.getElementById('filter');
		input = document.createElement('input');
		input.setAttribute('type','text');
		input.setAttribute('placeholder','Filter dashboard panels');
		el.appendChild(input);

		document.querySelectorAll('section.theme').forEach(el => {
			sections.push({'el':el,'cards':el.querySelectorAll('.grid .card')});
		});
		input.addEventListener('keyup',function(e){ filter(sections,input.value); });
	}
})(window || this);

OI.ready(function(){

	OI.filterCards();

	// Add rating help
	document.querySelectorAll('.rel').forEach(el => {
		var dir = el.getAttribute('data');
		// Build tooltip text
		var txt = 'More stars awarded for a '+(dir=="h" ? "higher":"lower")+' number.';
		// Build an element
		var tt = document.createElement('span');
		tt.innerHTML = '[?]';
		tt.setAttribute('title',txt);
		el.after(tt);
		OI.Tooltips.add(tt,{})
		
	});

});