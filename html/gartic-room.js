(() => {
    $('#open-rooms').on('click', function (e) {
        e.preventDefault();

        if (!$('#rooms').hasClass('hidden')) {
            $('#rooms').css('animation', 'fadeOutLeft 0.5s forwards');

            setTimeout(() => {
                $('#rooms').addClass('hidden');
                $('#rooms').css('animation', '');
            }, 500);
            return;
        }

        $('#rooms').removeClass('hidden');
        $('#rooms').css('animation', 'fadeInLeft 0.5s forwards');

        setTimeout(() => {
            $('#rooms').css('animation', '');
        }, 500);
    });
})();