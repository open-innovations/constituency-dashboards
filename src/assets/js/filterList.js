function filterList() {
	// Declare variables
	var input, filter, li, a, i, txtValue, matched;
	input = document.getElementById('searchInput');
	filter = input.value.toUpperCase();
	li = document.querySelectorAll("#searchable li");
	if(input.value.length == 0){
		for(i = 0; i < li.length; i++){
			li[i].style.display = "none";
		}
		return;
	}
	// Loop through all list items, and hide those who don't match the search query
	for (i = 0; i < li.length; i++) {
		a = li[i].getElementsByTagName("a")[0];
		txtValue = a.textContent || a.innerText;
		href = a.getAttribute('href');
		matched = false;
		if(txtValue.toUpperCase().indexOf(filter) > -1) matched = true;
		if(href.toUpperCase().indexOf(filter) > -1) matched = true;
		li[i].style.display = (matched ? "" : "none");
	}
}