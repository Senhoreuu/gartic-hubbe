(() => {
    $('#open-rooms').on('click', function (e) {
        e.preventDefault();

        if ($('#rooms').css('display') === 'block') {
            $('#rooms').css('animation', 'fadeOutUp 0.5s forwards');

            setTimeout(() => {
                $('#rooms').addClass('hidden');
                $('#rooms').css('animation', '');
            }, 500);
            return;
        }

        $('#rooms').removeClass('hidden');
        $('#rooms').css('animation', 'fadeInDown 0.5s forwards');

        setTimeout(() => {
            $('#rooms').css('animation', '');
        }, 500);
    });
})();