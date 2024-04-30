(() => {
    function appearOrDisappear(element, animationIn, animationOut) {
        if (!element.hasClass('hidden')) {
            element.css('animation', animationOut + ' 0.5s forwards');

            setTimeout(() => {
                element.addClass('hidden');
                element.css('animation', '');
            }, 500);
            return;
        }

        element.removeClass('hidden');
        element.css('animation', animationIn + ' 0.5s forwards');

        setTimeout(() => {
            element.css('animation', '');
        }, 500);
    }

    $('#open-rooms').on('click', function (e) {
        e.preventDefault();

        appearOrDisappear($('#rooms'), 'fadeInLeft', 'fadeOutLeft');

        if (!$('#info').hasClass('hidden')) {
            appearOrDisappear($('#info'), 'bounceIn', 'bounceOut');
        }

        if (!$('#sound').hasClass('hidden')) {
            appearOrDisappear($('#sound'), 'bounceIn', 'bounceOut');
        }
    });

    $('#create-room').on('click', function (e) {
    });

    $("#open-info").on("click", function (e) {
        e.preventDefault();

        appearOrDisappear($('#info'), 'bounceIn', 'bounceOut');

        if (!$('#rooms').hasClass('hidden')) {
            appearOrDisappear($('#rooms'), 'fadeInLeft', 'fadeOutLeft');
        }

        if (!$('#sound').hasClass('hidden')) {
            appearOrDisappear($('#sound'), 'bounceIn', 'bounceOut');
        }
    });

    $("#open-sound").on("click", function (e) {
        e.preventDefault();

        appearOrDisappear($('#sound'), 'bounceIn', 'bounceOut');

        if (!$('#rooms').hasClass('hidden')) {
            appearOrDisappear($('#rooms'), 'fadeInLeft', 'fadeOutLeft');
        }

        if (!$('#info').hasClass('hidden')) {
            appearOrDisappear($('#info'), 'bounceIn', 'bounceOut');
        }
    });
})();