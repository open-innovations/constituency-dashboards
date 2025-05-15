function getRandomElementFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

document.addEventListener("DOMContentLoaded", function() {
	// Get all the constituencies from the page
	const list = document.querySelectorAll('#searchable li');
	if(list.length > 0){
		// Create a lucky dip button
		const btn = document.createElement('button');
		btn.innerHTML = "Lucky dip";
		btn.addEventListener('click',function(){
			var li = getRandomElementFromArray(list);
			if(li){
				location.href = li.querySelector('a').getAttribute('href');
			}else{
				console.error('No random list item found',list);
			}
		});
		document.querySelector('.oi-filter').append(btn);
	}
});