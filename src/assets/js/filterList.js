function filterList() {
	// Declare variables
	var input, filter, li, i, txtValue, matched;
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
		txtValue = li[i].textContent || li[i].innerText;
		href = li[i].getElementsByTagName("a")[0].getAttribute('href');
		matched = false;
		if(txtValue.toUpperCase().indexOf(filter) > -1) matched = true;
		if(href.toUpperCase().indexOf(filter) > -1) matched = true;
		li[i].style.display = (matched ? "" : "none");
	}
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